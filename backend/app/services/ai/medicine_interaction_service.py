"""
HealthWeave – Medicine Interaction Service
Detects potential drug-drug interactions for a patient's active medications.
Uses AI analysis + known pharmacological patterns.
NOT a replacement for clinical pharmacist review.
"""

import json
import logging
from itertools import combinations
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

INTERACTION_SYSTEM = """You are a clinical pharmacology AI assistant specializing in drug interaction analysis.

CRITICAL RULES:
- Identify KNOWN and POTENTIAL drug-drug interactions only
- Rate severity: minor | moderate | major | contraindicated
- For each interaction, explain the pharmacological mechanism if known
- Provide clinical significance and what to monitor
- Recommend consultation with prescribing physician or pharmacist
- Never suggest stopping or changing medication without physician guidance
- Use evidence-based sources (FDA, DrugBank, British National Formulary)
- Always note when data is limited or interaction is theoretical

Severity definitions:
- contraindicated: Must NOT be used together, risk of serious harm
- major: Life-threatening or permanent damage risk, avoid if possible
- moderate: May require dose adjustment or close monitoring
- minor: Minimal clinical significance, usually no action needed
"""


class MedicineInteractionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    async def check_and_save_interactions(self, user_id: UUID) -> list[dict]:
        """
        Check all active medicines for a patient for drug-drug interactions.
        Saves results to MedicineInteractionAlert table.
        Returns list of found interactions.
        """
        from app.models.health_record import MedicineEntry
        from app.models.medicine import MedicineInteractionAlert

        # Get all active medicines
        result = await self.db.execute(
            select(MedicineEntry).where(
                MedicineEntry.user_id == user_id,
                MedicineEntry.status == "active",
                MedicineEntry.canonical_name.isnot(None),
            )
        )
        medicines = result.scalars().all()

        if len(medicines) < 2:
            return []

        # Clear previous AI-generated interactions for fresh check
        from sqlalchemy import delete
        await self.db.execute(
            delete(MedicineInteractionAlert).where(
                MedicineInteractionAlert.user_id == user_id,
                MedicineInteractionAlert.source == "AI",
            )
        )

        medicine_list = [
            {
                "id": str(m.id),
                "name": m.canonical_name or m.raw_name,
                "generic": m.generic_name,
                "drug_class": m.drug_class,
                "dosage": f"{m.dosage} {m.dosage_unit}" if m.dosage else None,
                "prescribed_for": m.prescribed_for,
            }
            for m in medicines
        ]

        prompt = f"""Analyze these {len(medicine_list)} active medications for drug-drug interactions.

Active Medications:
{json.dumps(medicine_list, indent=2)}

For each significant interaction found (moderate, major, or contraindicated):
1. Identify the two drugs involved
2. Rate severity: minor | moderate | major | contraindicated
3. Explain the mechanism and what can happen
4. State clinical significance (what symptoms or effects to watch for)
5. Recommend what the patient/doctor should do

Return as JSON array. If no significant interactions, return empty array [].

[{{
    "medicine_a_id": "<id from list>",
    "medicine_a_name": "<name>",
    "medicine_b_id": "<id from list>",
    "medicine_b_name": "<name>",
    "severity": "minor|moderate|major|contraindicated",
    "description": "<mechanism and what happens>",
    "clinical_significance": "<symptoms to watch for, risk explanation>",
    "recommendation": "<what patient and doctor should do>",
    "confidence": 0.0-1.0
}}]
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=INTERACTION_SYSTEM,
            inject_disclaimer=False,
        )

        interactions = []
        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            interactions = json.loads(raw)
        except Exception as exc:
            logger.warning("Could not parse interaction response: %s", exc)
            return []

        saved = []
        med_id_map = {str(m.id): m for m in medicines}

        for interaction in interactions:
            med_a = med_id_map.get(interaction.get("medicine_a_id"))
            med_b = med_id_map.get(interaction.get("medicine_b_id"))

            if not med_a or not med_b:
                # Try matching by name if IDs don't match
                for m in medicines:
                    if m.canonical_name and interaction.get("medicine_a_name", "").lower() in m.canonical_name.lower():
                        med_a = m
                    if m.canonical_name and interaction.get("medicine_b_name", "").lower() in m.canonical_name.lower():
                        med_b = m

            if not med_a or not med_b:
                continue

            alert = MedicineInteractionAlert(
                user_id=user_id,
                medicine_a_id=med_a.id,
                medicine_b_id=med_b.id,
                severity=interaction.get("severity", "moderate"),
                description=interaction.get("description", ""),
                clinical_significance=interaction.get("clinical_significance", ""),
                recommendation=interaction.get("recommendation", ""),
                source="AI",
            )
            self.db.add(alert)
            saved.append({
                "medicine_a": interaction.get("medicine_a_name"),
                "medicine_b": interaction.get("medicine_b_name"),
                "severity": interaction.get("severity"),
                "description": interaction.get("description"),
                "clinical_significance": interaction.get("clinical_significance"),
                "recommendation": interaction.get("recommendation"),
            })

        if saved:
            await self.db.commit()

        return saved

    async def get_interactions(self, user_id: UUID) -> list[dict]:
        """Return all unacknowledged medicine interactions for a patient."""
        from app.models.medicine import MedicineInteractionAlert
        from app.models.health_record import MedicineEntry

        result = await self.db.execute(
            select(
                MedicineInteractionAlert,
                MedicineEntry.canonical_name.label("med_a_name"),
            )
            .join(MedicineEntry, MedicineEntry.id == MedicineInteractionAlert.medicine_a_id)
            .where(
                MedicineInteractionAlert.user_id == user_id,
                MedicineInteractionAlert.is_acknowledged == False,
            )
            .order_by(MedicineInteractionAlert.created_at.desc())
        )
        rows = result.all()

        # Get medicine b names separately
        interactions = []
        for alert, med_a_name in rows:
            med_b_result = await self.db.execute(
                select(MedicineEntry.canonical_name).where(MedicineEntry.id == alert.medicine_b_id)
            )
            med_b_name = med_b_result.scalar_one_or_none() or "Unknown"

            interactions.append({
                "id": str(alert.id),
                "medicine_a": med_a_name or "Unknown",
                "medicine_b": med_b_name,
                "severity": alert.severity,
                "description": alert.description,
                "clinical_significance": alert.clinical_significance,
                "recommendation": alert.recommendation,
                "source": alert.source,
                "created_at": str(alert.created_at),
            })

        return interactions
