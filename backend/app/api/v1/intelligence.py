"""
HealthWeave – Intelligence API
Health scores, predictions, correlations, comparisons, and doctor summaries.
"""

import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.intelligence import (
    CorrelationFinding,
    HealthScore,
    PredictiveAlert,
)
from app.services.ai.correlation_engine import CorrelationEngine
from app.services.ai.prediction_engine import PredictionEngine
from app.services.ai.medicine_interaction_service import MedicineInteractionService
from app.services.analytics.timeline_service import TimelineService

router = APIRouter(prefix="/intelligence", tags=["AI Intelligence"])


@router.get("/health-scores")
async def get_health_scores(
    request: Request,
    limit: int = Query(30, ge=1, le=365),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get health score time series."""
    from app.services.audit_service import log_event
    await log_event(db, action="health_scores.read", resource="health_score",
                    user_id=user_id, request=request)
    from sqlalchemy import desc
    result = await db.execute(
        select(HealthScore)
        .where(HealthScore.user_id == uuid.UUID(user_id))
        .order_by(desc(HealthScore.scored_date), desc(HealthScore.created_at))
        .limit(limit)
    )
    scores = result.scalars().all()
    return {
        "scores": [
            {
                "date": str(s.scored_date),
                "overall_score": s.overall_score,
                "heart": s.heart_score,
                "liver": s.liver_score,
                "kidney": s.kidney_score,
                "metabolic": s.metabolic_score,
                "inflammation": s.inflammation_score,
                "lifestyle": s.lifestyle_score,
                "preventive": s.preventive_score,
                "thyroid": s.thyroid_score,
                "blood": s.blood_score,
                "ai_narrative": s.ai_narrative,
                "confidence": s.confidence,
                "data_completeness": s.data_completeness,
            }
            for s in scores
        ]
    }


@router.post("/health-scores/compute")
async def compute_health_scores(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Trigger recomputation of health scores."""
    background_tasks.add_task(_compute_scores_background, user_id)
    return {"status": "computing", "message": "Health scores are being recomputed"}


@router.get("/alerts")
async def get_predictive_alerts(
    dismissed: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import desc
    result = await db.execute(
        select(PredictiveAlert)
        .where(
            PredictiveAlert.user_id == uuid.UUID(user_id),
            PredictiveAlert.is_dismissed == dismissed,
        )
        .order_by(desc(PredictiveAlert.generated_at))
        .limit(50)
    )
    alerts = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type,
            "category": a.category,
            "title": a.title,
            "summary": a.summary,
            "detailed_explanation": a.detailed_explanation,
            "risk_level": a.risk_level,
            "risk_score": a.risk_score,
            "confidence": a.confidence,
            "time_horizon": a.time_horizon,
            "recommended_actions": a.recommended_actions,
            "consult_specialist": a.consult_specialist,
            "medical_disclaimer": a.medical_disclaimer,
            "generated_at": str(a.generated_at),
        }
        for a in alerts
    ]


@router.post("/alerts/generate")
async def generate_alerts(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    background_tasks.add_task(_generate_alerts_background, user_id)
    return {"status": "generating", "message": "Predictive alerts are being generated"}


@router.post("/alerts/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update
    from datetime import datetime, timezone
    await db.execute(
        update(PredictiveAlert)
        .where(
            PredictiveAlert.id == uuid.UUID(alert_id),
            PredictiveAlert.user_id == uuid.UUID(user_id),
        )
        .values(is_dismissed=True, dismissed_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"status": "dismissed"}


@router.get("/correlations")
async def get_correlations(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import desc
    result = await db.execute(
        select(CorrelationFinding)
        .where(CorrelationFinding.user_id == uuid.UUID(user_id))
        .order_by(desc(CorrelationFinding.computed_at))
        .limit(30)
    )
    findings = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "finding_type": f.finding_type,
            "title": f.title,
            "description": f.description,
            "significance": f.clinical_significance,
            "entities": f.entities_involved,
            "confidence": f.confidence,
            "ai_explanation": f.ai_explanation,
            "preventive_suggestion": f.preventive_suggestion,
            "computed_at": str(f.computed_at),
        }
        for f in findings
    ]


@router.post("/correlations/run")
async def run_correlation_analysis(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    background_tasks.add_task(_run_correlations_background, user_id)
    return {"status": "running", "message": "Correlation analysis started"}


@router.get("/doctor-summary")
async def get_doctor_summary(
    specialization: str = Query(None, description="e.g. cardiologist, endocrinologist, general_physician"),
    days_back: int = Query(180, ge=30, le=730),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a pre-consultation summary tailored to the doctor's specialization.
    Filters and emphasises only the biomarkers relevant to that specialty.
    """
    from app.services.ai.lab_analysis_service import LabAnalysisService
    service = LabAnalysisService(db)
    result = await service.generate_doctor_summary(
        user_id=uuid.UUID(user_id),
        specialization=specialization,
        days_back=days_back,
    )
    result["generated_at"] = date.today().isoformat()
    return result


@router.get("/lab-analysis/{record_id}")
async def get_lab_analysis(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Comprehensive AI analysis for a specific lab report:
    panel-level interpretation, historical comparison, pattern recognition,
    risk summary, and actionable recommendations.
    """
    from app.models.health_record import BiomarkerValue
    from sqlalchemy import select as sa_select

    # Verify ownership
    from app.models.health_record import HealthRecord
    rec_result = await db.execute(
        sa_select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    if not rec_result.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Record not found")

    bv_result = await db.execute(
        sa_select(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id))
    )
    biomarkers = [
        {
            "name": bv.name,
            "canonical_name": bv.canonical_name,
            "value_numeric": bv.value_numeric,
            "unit": bv.unit,
            "status": bv.status,
            "reference_range": bv.reference_range_text,
            "reference_low": bv.reference_range_low,
            "reference_high": bv.reference_range_high,
        }
        for bv in bv_result.scalars().all()
    ]

    from app.services.ai.lab_analysis_service import LabAnalysisService
    service = LabAnalysisService(db)
    result = await service.generate_comprehensive_analysis(
        user_id=uuid.UUID(user_id),
        record_id=record_id,
        biomarkers=biomarkers,
    )
    result["record_id"] = record_id
    result["generated_at"] = date.today().isoformat()
    return result


@router.get("/biomarker-trend/{biomarker_name}")
async def get_biomarker_longitudinal_trend(
    biomarker_name: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Full longitudinal analysis for one biomarker across all records.
    Shows every reading, trend direction, rate of change, and AI interpretation.
    """
    from app.services.ai.lab_analysis_service import LabAnalysisService
    service = LabAnalysisService(db)
    return await service.compare_test_over_time(
        user_id=uuid.UUID(user_id),
        biomarker_name=biomarker_name,
    )


@router.get("/timeline")
async def get_timeline(
    year: int | None = Query(None),
    event_types: list[str] | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TimelineService(db)
    return await service.get_full_timeline(
        user_id=uuid.UUID(user_id),
        year=year,
        event_types=event_types,
        limit=limit,
    )


@router.get("/timeline/compare")
async def compare_reports(
    record_id_1: str = Query(...),
    record_id_2: str = Query(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TimelineService(db)
    return await service.compare_reports(
        user_id=uuid.UUID(user_id),
        record_id_1=uuid.UUID(record_id_1),
        record_id_2=uuid.UUID(record_id_2),
    )


@router.get("/biomarker-trends")
async def get_biomarker_trends(
    months: int = Query(24, ge=1, le=120),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return time-series data for all biomarkers with trend analysis."""
    from sqlalchemy import text, desc
    sql = text("""
        WITH ranked AS (
            SELECT
                canonical_name,
                name,
                value_numeric,
                unit,
                status,
                measured_at,
                reference_range_low,
                reference_range_high,
                COUNT(*) OVER (PARTITION BY canonical_name) AS total_readings
            FROM biomarker_values
            WHERE user_id = :user_id
              AND value_numeric IS NOT NULL
              AND canonical_name IS NOT NULL
              AND measured_at >= NOW() - INTERVAL '1 month' * :months
        )
        SELECT
            canonical_name,
            MAX(name) AS display_name,
            MAX(unit) AS unit,
            array_agg(value_numeric ORDER BY measured_at) AS values,
            array_agg(measured_at ORDER BY measured_at) AS dates,
            array_agg(status ORDER BY measured_at) AS statuses,
            MAX(reference_range_low) AS ref_min,
            MAX(reference_range_high) AS ref_max,
            total_readings
        FROM ranked
        WHERE total_readings >= 1
        GROUP BY canonical_name, total_readings
        ORDER BY total_readings DESC, canonical_name
        LIMIT 30
    """)
    result = await db.execute(sql, {"user_id": user_id, "months": months})
    rows = result.mappings().all()

    biomarkers = []
    for row in rows:
        values = list(row["values"])
        dates = [str(d)[:10] for d in row["dates"]]
        statuses = list(row["statuses"])
        latest = values[-1] if values else None
        first = values[0] if values else None
        change_pct = round(((latest - first) / abs(first)) * 100, 1) if first and first != 0 and latest is not None else None

        trend = "stable"
        if change_pct is not None:
            if change_pct > 10:
                trend = "rising"
            elif change_pct < -10:
                trend = "falling"

        biomarkers.append({
            "name": row["canonical_name"],
            "display_name": row["display_name"] or row["canonical_name"].replace("_", " ").title(),
            "unit": row["unit"] or "",
            "readings": [{"date": d, "value": v, "status": s} for d, v, s in zip(dates, values, statuses)],
            "latest_value": latest,
            "latest_status": statuses[-1] if statuses else "unknown",
            "reference_range": {"min": row["ref_min"], "max": row["ref_max"]},
            "trend": trend,
            "change_percent": change_pct,
            "total_readings": row["total_readings"],
        })

    return {"biomarkers": biomarkers, "months": months}


@router.get("/risk-predictions")
async def get_risk_predictions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get stored risk predictions grouped by disease category."""
    from sqlalchemy import desc
    result = await db.execute(
        select(PredictiveAlert)
        .where(
            PredictiveAlert.user_id == uuid.UUID(user_id),
            PredictiveAlert.is_dismissed == False,
            PredictiveAlert.alert_type == "risk_trend",
        )
        .order_by(desc(PredictiveAlert.risk_score))
        .limit(20)
    )
    alerts = result.scalars().all()
    return {
        "predictions": [
            {
                "id": str(a.id),
                "condition": a.category or a.title,
                "title": a.title,
                "risk_level": a.risk_level,
                "risk_score": a.risk_score,
                "confidence": a.confidence,
                "time_horizon": a.time_horizon,
                "summary": a.summary,
                "key_indicators": a.supporting_evidence or [],
                "recommended_actions": a.recommended_actions or [],
                "consult_specialist": a.consult_specialist,
            }
            for a in alerts
        ]
    }


@router.post("/risk-predictions/run")
async def run_risk_predictions(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Trigger fresh risk prediction computation."""
    background_tasks.add_task(_generate_alerts_background, user_id)
    return {"status": "running", "message": "Risk predictions are being computed"}


@router.get("/medicine-interactions")
async def get_medicine_interactions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all active drug-drug interaction alerts for the patient."""
    service = MedicineInteractionService(db)
    interactions = await service.get_interactions(uuid.UUID(user_id))
    return {"interactions": interactions, "count": len(interactions)}


@router.post("/medicine-interactions/check")
async def check_medicine_interactions(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Trigger a fresh drug interaction check for all active medicines."""
    background_tasks.add_task(_check_interactions_background, user_id)
    return {"status": "checking", "message": "Drug interaction analysis started"}


@router.post("/medicine-interactions/{interaction_id}/acknowledge")
async def acknowledge_interaction(
    interaction_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Mark a drug interaction alert as acknowledged."""
    from sqlalchemy import update
    from datetime import datetime, timezone
    from app.models.medicine import MedicineInteractionAlert
    await db.execute(
        update(MedicineInteractionAlert)
        .where(
            MedicineInteractionAlert.id == uuid.UUID(interaction_id),
            MedicineInteractionAlert.user_id == uuid.UUID(user_id),
        )
        .values(is_acknowledged=True, acknowledged_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"status": "acknowledged"}


@router.get("/knowledge-graph")
async def get_knowledge_graph(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return patient-specific health knowledge graph for visualization."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../ai"))
    try:
        from knowledge_graph.health_graph import HealthKnowledgeGraph
        graph = HealthKnowledgeGraph()

        # Enrich with patient's actual conditions and medicines
        from sqlalchemy import text
        bio_result = await db.execute(text("""
            SELECT DISTINCT ON (canonical_name) canonical_name, status, value_numeric
            FROM biomarker_values
            WHERE user_id = :uid AND canonical_name IS NOT NULL
            ORDER BY canonical_name, measured_at DESC
        """), {"uid": user_id})
        biomarkers = bio_result.mappings().all()

        med_result = await db.execute(text("""
            SELECT DISTINCT canonical_name, drug_class, prescribed_for
            FROM medicine_entries
            WHERE user_id = :uid AND status = 'active' AND canonical_name IS NOT NULL
        """), {"uid": user_id})
        medicines = med_result.mappings().all()

        icd_result = await db.execute(text("""
            SELECT DISTINCT unnest(icd10_codes) AS code
            FROM health_records
            WHERE user_id = :uid AND cardinality(icd10_codes) > 0
        """), {"uid": user_id})
        icd_codes = [r["code"] for r in icd_result.mappings().all()]

        patient_data = {
            "abnormal_biomarkers": [b["canonical_name"] for b in biomarkers if b["status"] in ("high", "low", "critical")],
            "all_biomarkers": [b["canonical_name"] for b in biomarkers],
            "active_medicines": [m["canonical_name"] for m in medicines],
            "icd10_codes": icd_codes,
        }
        graph.enrich_with_patient_data(patient_data)
        return graph.to_cytoscape_json()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Knowledge graph error: %s", exc)
        return {"nodes": [], "edges": [], "error": "Knowledge graph unavailable"}


# ── Background helpers ────────────────────────────────────────────────────────

import re as _re

# A header "word" must start with 2+ consecutive uppercase letters, so a
# sentence-starting capital ("The", "Your"...) right after a header is never
# mistaken for the start of another header — Python's stdlib `re` has no
# \p{Extended_Pictographic}, so leading emoji are matched generically as
# "non-word, non-whitespace" characters instead of a Unicode property class.
_HEADER_RE = _re.compile(
    r"^[^\w\s]{0,4}\s*((?:[A-Z]{2,}[A-Z0-9]*[\s/&—–-]*)+(?:\(\d{1,3}/100[^)]*\))?)"
)
_HEADER_COUNT_RE = _re.compile(r"(?:[A-Z]{2,}[A-Z0-9]*\s+){2,}[A-Z]{2,}[A-Z0-9]*")


def _normalize_narrative(narrative) -> dict:
    """
    Best-effort conversion of an ai_narrative LLM response into the structured
    shape the frontend (AiNarrative.tsx) renders as distinct sections.

    Handles three shapes seen in practice:
    1. Already a dict matching the requested schema — passed through.
    2. A dict where the LLM crammed everything into a single field (e.g.
       "summary") as one long string with emoji/ALL-CAPS headers separated by
       "---" dividers, instead of using the dedicated array fields.
    3. A plain string with the same "---"-delimited emoji-header shape.

    Splitting server-side (rather than relying solely on the frontend's
    best-effort parser) means every newly computed score gets a consistent,
    correctly-sectioned narrative regardless of how strictly the LLM followed
    the JSON schema in a given response.
    """
    if isinstance(narrative, str):
        narrative = {"summary": narrative}
    if not isinstance(narrative, dict):
        return narrative

    # Detect the "everything dumped into one field" case: any field whose
    # text contains multiple "---"-style dividers or 2+ emoji-prefixed headers.
    blob_key = None
    blob_text = ""
    for key in ("summary", "disclaimer", "data_currency_warning"):
        val = narrative.get(key)
        if isinstance(val, str) and ("---" in val or len(_HEADER_COUNT_RE.findall(val)) >= 3):
            blob_key, blob_text = key, val
            break

    if not blob_key:
        return narrative

    chunks = [c.strip() for c in _re.split(r"-{2,}", blob_text) if c.strip()]
    out: dict = {k: v for k, v in narrative.items() if k != blob_key}
    out.setdefault("key_areas", [])
    out.setdefault("reassuring_findings", [])
    out.setdefault("next_steps", [])

    for chunk in chunks:
        match = _HEADER_RE.match(chunk)
        header_clean = match.group(1).strip() if match else ""
        body = chunk[match.end():].strip() if match else chunk
        upper = header_clean.upper()

        if "DISCLAIMER" in upper:
            out["disclaimer"] = out.get("disclaimer") or body or chunk
        elif "OVERALL HEALTH SCORE" in upper or (not header_clean and not out.get("summary")):
            out["summary"] = out.get("summary") or (body or chunk)
        elif "REASSUR" in upper:
            items = [i.strip(" .") for i in _re.split(r"[•\n]|(?<=[a-z])\.\s+(?=[A-Z])", body) if i.strip(" .")]
            out["reassuring_findings"].extend(items or [body])
        elif "RECOMMEND" in upper or "NEXT STEP" in upper or "ACTION" in upper:
            items = [i.strip() for i in _re.split(r"\d{1,2}\.\s+", body) if i.strip()]
            out["next_steps"].extend(items or [body])
        elif "DATA CURRENCY" in upper or "WARNING" in upper:
            out["data_currency_warning"] = out.get("data_currency_warning") or body or chunk
        elif header_clean:
            score_match = _re.search(r"\(?(\d{1,3})/100", chunk)
            out["key_areas"].append({
                "title": _re.sub(r"\(.*?\)", "", header_clean).strip(),
                "score": int(score_match.group(1)) if score_match else None,
                "status": None,
                "detail": body,
            })
        elif body:
            out["summary"] = (out.get("summary") + " " + body).strip() if out.get("summary") else body

    return out


async def _compute_scores_background(user_id: str):
    import json as _json
    from app.core.database import get_db_context
    async with get_db_context() as db:
        engine = PredictionEngine(db)
        result = await engine.compute_health_scores(uuid.UUID(user_id))
        scores_data = result.get("scores", {})
        narrative = _normalize_narrative(result.get("ai_narrative"))
        # ai_narrative is a Text column — structured narratives come back as a
        # dict from the LLM and must be JSON-encoded for storage; the frontend
        # JSON.parse()s it back out (and falls back to plain-text parsing for
        # narratives stored before this structured format existed).
        if isinstance(narrative, dict):
            narrative = _json.dumps(narrative)

        field_values = dict(
            overall_score=scores_data.get("overall_score"),
            heart_score=scores_data.get("heart_score"),
            liver_score=scores_data.get("liver_score"),
            kidney_score=scores_data.get("kidney_score"),
            metabolic_score=scores_data.get("metabolic_score"),
            inflammation_score=scores_data.get("inflammation_score"),
            lifestyle_score=scores_data.get("lifestyle_score"),
            preventive_score=scores_data.get("preventive_score"),
            thyroid_score=scores_data.get("thyroid_score"),
            blood_score=scores_data.get("blood_score"),
            ai_narrative=narrative,
            confidence=result.get("confidence"),
            data_completeness=result.get("data_completeness"),
            contributing_factors=result.get("contributing_factors", {}),
        )

        # health_scores has a UNIQUE (user_id, scored_date) constraint, so a
        # second compute on the same calendar day (e.g. a 2nd/3rd report
        # uploaded the same day, or clicking "Recompute" twice) must update
        # today's existing row rather than INSERT, which would otherwise
        # raise IntegrityError and get silently swallowed by the caller.
        existing_result = await db.execute(
            select(HealthScore).where(
                HealthScore.user_id == uuid.UUID(user_id),
                HealthScore.scored_date == date.today(),
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            for key, value in field_values.items():
                setattr(existing, key, value)
        else:
            db.add(HealthScore(user_id=uuid.UUID(user_id), scored_date=date.today(), **field_values))
        await db.commit()


async def _generate_alerts_background(user_id: str):
    from app.core.database import get_db_context
    from datetime import datetime, timezone
    async with get_db_context() as db:
        engine = PredictionEngine(db)
        alerts_data = await engine.generate_predictive_alerts(uuid.UUID(user_id))
        for alert_dict in alerts_data:
            alert = PredictiveAlert(
                user_id=uuid.UUID(user_id),
                alert_type=alert_dict.get("alert_type", "risk_trend"),
                category=alert_dict.get("category"),
                title=alert_dict.get("title", "Health Alert"),
                summary=alert_dict.get("summary"),
                detailed_explanation=alert_dict.get("detailed_explanation"),
                risk_level=alert_dict.get("risk_level", "moderate"),
                risk_score=alert_dict.get("risk_score"),
                confidence=alert_dict.get("confidence"),
                time_horizon=alert_dict.get("time_horizon"),
                supporting_evidence=alert_dict.get("supporting_evidence", []),
                recommended_actions=alert_dict.get("recommended_actions", []),
                consult_specialist=alert_dict.get("consult_specialist"),
                medical_disclaimer=alert_dict.get("medical_disclaimer", ""),
            )
            db.add(alert)
        await db.commit()


async def _check_interactions_background(user_id: str):
    from app.core.database import get_db_context
    async with get_db_context() as db:
        service = MedicineInteractionService(db)
        await service.check_and_save_interactions(uuid.UUID(user_id))


async def _run_correlations_background(user_id: str):
    from app.core.database import get_db_context
    async with get_db_context() as db:
        engine = CorrelationEngine(db)
        findings = await engine.run_full_correlation(uuid.UUID(user_id))

        # Findings reflect the patient's *current* longitudinal state, not a
        # historical log — replace the previous set rather than accumulating
        # duplicates each time this runs (now also triggered on every upload,
        # not just the manual "Run Analysis" button).
        await db.execute(delete(CorrelationFinding).where(CorrelationFinding.user_id == uuid.UUID(user_id)))

        for finding in findings:
            cf = CorrelationFinding(
                user_id=uuid.UUID(user_id),
                finding_type=finding.get("finding_type", "general"),
                title=finding.get("title", "Health Pattern"),
                description=finding.get("description"),
                clinical_significance=finding.get("significance"),
                entities_involved=finding.get("biomarkers_involved", []),
                confidence=finding.get("confidence"),
                ai_explanation=finding.get("description"),
                preventive_suggestion=finding.get("preventive_suggestion"),
                medical_disclaimer="This is a pattern indicator, not a diagnosis.",
            )
            db.add(cf)
        await db.commit()
