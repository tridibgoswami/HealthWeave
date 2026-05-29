"""
HealthWeave – Intelligence API
Health scores, predictions, correlations, comparisons, and doctor summaries.
"""

import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, Query
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
    limit: int = Query(30, ge=1, le=365),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get health score time series."""
    from sqlalchemy import desc
    result = await db.execute(
        select(HealthScore)
        .where(HealthScore.user_id == uuid.UUID(user_id))
        .order_by(desc(HealthScore.scored_date))
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
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate pre-consultation doctor summary."""
    engine = PredictionEngine(db)
    summary = await engine.generate_doctor_summary(uuid.UUID(user_id))
    return {
        "summary": summary,
        "generated_at": date.today().isoformat(),
        "note": "For informational use only. Always consult your healthcare provider.",
    }


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
                display_name,
                value_numeric,
                unit,
                status,
                measured_at,
                reference_range_min,
                reference_range_max,
                COUNT(*) OVER (PARTITION BY canonical_name) AS total_readings
            FROM biomarker_values
            WHERE user_id = :user_id
              AND value_numeric IS NOT NULL
              AND canonical_name IS NOT NULL
              AND measured_at >= NOW() - INTERVAL '1 month' * :months
        )
        SELECT
            canonical_name,
            MAX(display_name) AS display_name,
            MAX(unit) AS unit,
            array_agg(value_numeric ORDER BY measured_at) AS values,
            array_agg(measured_at ORDER BY measured_at) AS dates,
            array_agg(status ORDER BY measured_at) AS statuses,
            MAX(reference_range_min) AS ref_min,
            MAX(reference_range_max) AS ref_max,
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

async def _compute_scores_background(user_id: str):
    from app.core.database import get_db_context
    async with get_db_context() as db:
        engine = PredictionEngine(db)
        result = await engine.compute_health_scores(uuid.UUID(user_id))
        scores_data = result.get("scores", {})
        score = HealthScore(
            user_id=uuid.UUID(user_id),
            scored_date=date.today(),
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
            ai_narrative=result.get("ai_narrative"),
            confidence=result.get("confidence"),
            data_completeness=result.get("data_completeness"),
            contributing_factors=result.get("contributing_factors", {}),
        )
        db.add(score)
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
