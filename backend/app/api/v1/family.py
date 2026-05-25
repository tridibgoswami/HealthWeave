"""
HealthWeave – Family Health Graph API
Manage family members, hereditary risks, and caregiver access.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.family import FamilyMember, FamilyHereditaryRisk, Relationship, AccessLevel

router = APIRouter(prefix="/family", tags=["Family Health Graph"])


class AddFamilyMemberRequest(BaseModel):
    member_name: str
    relationship: Relationship
    access_level: AccessLevel = AccessLevel.VIEW_SUMMARY
    known_conditions: list[str] = []
    age_at_diagnosis: dict = {}
    is_deceased: bool = False
    notes: str | None = None


@router.post("/members", status_code=status.HTTP_201_CREATED)
async def add_family_member(
    payload: AddFamilyMemberRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    member = FamilyMember(
        user_id=uuid.UUID(user_id),
        member_name=payload.member_name,
        relationship=payload.relationship,
        access_level=payload.access_level,
        known_conditions=payload.known_conditions,
        age_at_diagnosis=payload.age_at_diagnosis,
        is_deceased=payload.is_deceased,
        notes=payload.notes,
    )
    db.add(member)
    await db.commit()

    # Trigger hereditary risk recomputation
    if payload.known_conditions:
        background_tasks.add_task(_compute_hereditary_risks, user_id)

    return {"id": str(member.id), "message": "Family member added"}


@router.get("/members")
async def list_family_members(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == uuid.UUID(user_id))
    )
    members = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "name": m.member_name,
            "relationship": m.relationship,
            "access_level": m.access_level,
            "known_conditions": m.known_conditions,
            "age_at_diagnosis": m.age_at_diagnosis,
            "is_deceased": m.is_deceased,
        }
        for m in members
    ]


@router.get("/hereditary-risks")
async def get_hereditary_risks(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FamilyHereditaryRisk)
        .where(FamilyHereditaryRisk.user_id == uuid.UUID(user_id))
        .order_by(FamilyHereditaryRisk.computed_at.desc())
    )
    risks = result.scalars().all()
    return [
        {
            "condition": r.condition,
            "risk_level": r.risk_level,
            "affected_relatives": r.affected_relatives,
            "risk_score": r.risk_score,
            "ai_explanation": r.ai_explanation,
            "preventive_actions": r.preventive_actions,
            "screening_recommendations": r.screening_recommendations,
        }
        for r in risks
    ]


@router.post("/hereditary-risks/compute")
async def trigger_hereditary_risk_computation(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    background_tasks.add_task(_compute_hereditary_risks, user_id)
    return {"status": "computing"}


async def _compute_hereditary_risks(user_id: str):
    from app.core.database import get_db_context
    from app.services.ai.llm_client import get_llm_client
    import json

    async with get_db_context() as db:
        result = await db.execute(
            select(FamilyMember).where(FamilyMember.user_id == uuid.UUID(user_id))
        )
        members = result.scalars().all()

        if not members:
            return

        family_data = [
            {
                "relationship": m.relationship,
                "conditions": m.known_conditions,
                "age_at_diagnosis": m.age_at_diagnosis,
                "is_deceased": m.is_deceased,
            }
            for m in members
        ]

        llm = get_llm_client()
        prompt = f"""Analyze this family health data and identify hereditary risk patterns.

Family Health History:
{json.dumps(family_data, indent=2)}

For each significant hereditary condition cluster:
1. Identify the condition
2. List affected relatives and ages
3. Estimate risk level (low/moderate/high/very_high)
4. Explain the hereditary pattern
5. Suggest preventive screenings

Return JSON array:
[{{
    "condition": "Type 2 Diabetes",
    "icd10_code": "E11",
    "affected_relatives": [{{"relation": "father", "age_onset": 50}}, ...],
    "risk_level": "high",
    "risk_score": {{"value": 0.72, "confidence": 0.8}},
    "ai_explanation": "...",
    "preventive_actions": ["..."],
    "screening_recommendations": ["Annual HbA1c", "..."]
}}]
"""
        response = await llm.complete(prompt=prompt, inject_disclaimer=False)
        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            risks = json.loads(raw)
            for risk in risks:
                existing = await db.execute(
                    select(FamilyHereditaryRisk).where(
                        FamilyHereditaryRisk.user_id == uuid.UUID(user_id),
                        FamilyHereditaryRisk.condition == risk["condition"],
                    )
                )
                existing_risk = existing.scalar_one_or_none()
                if existing_risk:
                    existing_risk.risk_level = risk.get("risk_level")
                    existing_risk.risk_score = risk.get("risk_score")
                    existing_risk.ai_explanation = risk.get("ai_explanation")
                    existing_risk.preventive_actions = risk.get("preventive_actions", [])
                    existing_risk.screening_recommendations = risk.get("screening_recommendations", [])
                    existing_risk.affected_relatives = risk.get("affected_relatives", [])
                else:
                    new_risk = FamilyHereditaryRisk(
                        user_id=uuid.UUID(user_id),
                        condition=risk.get("condition"),
                        icd10_code=risk.get("icd10_code"),
                        affected_relatives=risk.get("affected_relatives", []),
                        risk_level=risk.get("risk_level"),
                        risk_score=risk.get("risk_score"),
                        ai_explanation=risk.get("ai_explanation"),
                        preventive_actions=risk.get("preventive_actions", []),
                        screening_recommendations=risk.get("screening_recommendations", []),
                    )
                    db.add(new_risk)
            await db.commit()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Hereditary risk computation failed: %s", exc)
