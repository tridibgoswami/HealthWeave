"""
HealthWeave – Preventive Health Prediction Engine
Generates risk indicators and preventive alerts.
Strictly NOT diagnostic — risk trend indicators only.
"""

import json
import logging
from uuid import UUID
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_client import LLMClient, get_llm_client
from app.core.config import settings

logger = logging.getLogger(__name__)

PREDICTION_SYSTEM = """You are a preventive health intelligence AI.

Your ONLY job is to identify health risk indicators and suggest preventive measures.

CRITICAL RULES:
- You are NOT a diagnostic system
- Never say "you have X disease" — only "risk indicators suggest elevated risk for X"
- Always use probabilistic language: "may", "could indicate", "risk factor for"
- Always recommend consulting a healthcare professional
- Suggest evidence-based preventive measures
- Include confidence levels and data limitations
- If data is insufficient, say so clearly
"""


class PredictionEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    async def compute_health_scores(self, user_id: UUID) -> dict:
        """
        Compute multi-dimensional health scores (0-100) from available data.
        Higher = better health in that domain.
        """
        biomarkers = await self._get_all_biomarker_history(user_id)
        medicines = await self._get_medicine_summary(user_id)
        records_summary = await self._get_records_summary(user_id)

        prompt = f"""Compute health scores for a patient based on their health data.

Today's date: {date.today().isoformat()}

Available Data:
=== Biomarker History ===
{json.dumps(biomarkers, default=str, indent=2)[:3000]}

=== Active Medications ===
{json.dumps(medicines, default=str, indent=2)[:1000]}

=== Records Summary ===
{json.dumps(records_summary, default=str, indent=2)[:1000]}

Compute these scores (0-100, higher = healthier):
- overall_score: weighted average
- heart_score: cardiovascular health
- liver_score: liver health
- kidney_score: renal health
- metabolic_score: metabolic health (glucose, lipids, BMI)
- inflammation_score: inflammatory markers
- lifestyle_score: based on medicine compliance and lifestyle indicators
- preventive_score: screening compliance, vaccination, preventive visits
- thyroid_score: thyroid function
- blood_score: complete blood count indicators

Return JSON. The "ai_narrative" field MUST be a structured object (not a single
paragraph) so the UI can render it as distinct sections — do not put emoji
headers or numbered lists inside plain strings, use the array fields instead:
{{
    "scores": {{
        "overall_score": 72,
        "heart_score": 65,
        ...
    }},
    "data_completeness": 0.6,
    "confidence": 0.7,
    "contributing_factors": {{
        "heart_score": "Based on cholesterol (LDL elevated), BP (normal range)"
    }},
    "ai_narrative": {{
        "disclaimer": "This is a preventive health risk assessment tool — NOT a diagnostic system. Findings are risk indicators only; consult a qualified healthcare professional.",
        "summary": "One or two sentences on the overall score and what drives it.",
        "key_areas": [
            {{"title": "Liver Health", "score": 52, "status": "Needs Attention", "detail": "Why this area needs attention, in plain language."}}
        ],
        "reassuring_findings": ["Short reassuring finding 1", "Short reassuring finding 2"],
        "next_steps": ["Concrete next step 1", "Concrete next step 2"],
        "data_currency_warning": "Note on how recent/sparse the underlying data is, or empty string if not applicable."
    }}
}}
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=PREDICTION_SYSTEM,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Score computation parse error: %s", exc)
            return {
                "scores": {"overall_score": 50},
                "data_completeness": 0.1,
                "confidence": 0.3,
                "ai_narrative": {
                    "summary": "Insufficient data for detailed scoring. Please upload more health records.",
                },
            }

    async def generate_predictive_alerts(self, user_id: UUID) -> list[dict]:
        """Generate personalized preventive health alerts."""
        biomarkers = await self._get_all_biomarker_history(user_id)
        family_risks = await self._get_family_risk_summary(user_id)
        profile = await self._get_profile_basics(user_id)

        prompt = f"""Generate preventive health alerts for this patient.

Patient Profile:
{json.dumps(profile, default=str)}

Biomarker Trends (historical):
{json.dumps(biomarkers, default=str, indent=2)[:3000]}

Family Risk Factors:
{json.dumps(family_risks, default=str, indent=2)[:1000]}

Generate up to 6 prioritized preventive alerts.
Each alert must be preventive — not diagnostic.

Return JSON array:
[{{
    "alert_type": "risk_trend|preventive|screening_due|lifestyle",
    "category": "cardiovascular|metabolic|renal|hepatic|oncology|respiratory|other",
    "title": "...",
    "summary": "One sentence risk summary",
    "detailed_explanation": "2-3 paragraph explanation with data references",
    "risk_level": "low|moderate|high|critical",
    "risk_score": 0.0-1.0,
    "confidence": 0.0-1.0,
    "time_horizon": "3 months|1 year|5 years|ongoing",
    "supporting_evidence": [
        {{"type": "biomarker", "name": "HbA1c", "value": 6.1, "trend": "worsening"}}
    ],
    "recommended_actions": ["Action 1", "Action 2"],
    "consult_specialist": "Endocrinologist",
    "priority": 1-10
}}]
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=PREDICTION_SYSTEM,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            alerts = json.loads(raw)
            for alert in alerts:
                alert["medical_disclaimer"] = settings.MEDICAL_DISCLAIMER
            return sorted(alerts, key=lambda x: x.get("priority", 0), reverse=True)
        except Exception as exc:
            logger.warning("Alert generation parse error: %s", exc)
            return []

    async def generate_doctor_summary(self, user_id: UUID) -> str:
        """
        Generate a pre-consultation summary for the doctor —
        recent changes, abnormalities, and key context.
        """
        recent_records = await self._get_recent_records(user_id, days=90)
        active_medicines = await self._get_medicine_summary(user_id)
        biomarker_trends = await self._get_all_biomarker_history(user_id)

        prompt = f"""Generate a concise pre-consultation doctor summary for this patient.

The doctor has 5 minutes — focus on:
1. Most significant recent changes (last 90 days)
2. Abnormal values requiring attention
3. Ongoing medications and any changes
4. Pending follow-ups / screenings
5. Key risk indicators

Recent Records:
{json.dumps(recent_records, default=str, indent=2)[:2000]}

Active Medications:
{json.dumps(active_medicines, default=str)[:800]}

Biomarker Trends:
{json.dumps(biomarker_trends, default=str, indent=2)[:2000]}

Format: Professional clinical summary, bullet points where helpful.
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=PREDICTION_SYSTEM,
            max_tokens=settings.MAX_TOKENS_SUMMARY,
            inject_disclaimer=True,
        )
        return response.content

    async def _get_all_biomarker_history(self, user_id: UUID) -> list:
        sql = text("""
            SELECT canonical_name, value_numeric, unit, status, measured_at, source_lab
            FROM biomarker_values
            WHERE user_id = :user_id AND value_numeric IS NOT NULL
            ORDER BY canonical_name, measured_at DESC
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        rows = result.mappings().all()
        grouped: dict[str, list] = {}
        for row in rows:
            name = row["canonical_name"] or "unknown"
            grouped.setdefault(name, []).append({
                "value": row["value_numeric"],
                "unit": row["unit"],
                "status": row["status"],
                "date": str(row["measured_at"]),
            })
        return [{"biomarker": k, "readings": v} for k, v in grouped.items()]

    async def _get_medicine_summary(self, user_id: UUID) -> list:
        sql = text("""
            SELECT canonical_name, dosage, frequency, status, prescribed_date, prescribed_for
            FROM medicine_entries
            WHERE user_id = :user_id
            ORDER BY status, prescribed_date DESC
            LIMIT 30
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        return [dict(r) for r in result.mappings().all()]

    async def _get_records_summary(self, user_id: UUID) -> dict:
        sql = text("""
            SELECT record_type, COUNT(*) as count, MAX(record_date) as latest
            FROM health_records
            WHERE user_id = :user_id AND is_archived = false
            GROUP BY record_type
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        return {row["record_type"]: {"count": row["count"], "latest": str(row["latest"])} for row in result.mappings().all()}

    async def _get_family_risk_summary(self, user_id: UUID) -> list:
        sql = text("""
            SELECT condition, risk_level, affected_relatives, risk_score
            FROM family_hereditary_risks
            WHERE user_id = :user_id
            ORDER BY (risk_score->>'value')::float DESC NULLS LAST
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        return [dict(r) for r in result.mappings().all()]

    async def _get_profile_basics(self, user_id: UUID) -> dict:
        sql = text("""
            SELECT
                up.date_of_birth,
                up.gender,
                up.blood_group,
                up.height_cm,
                up.weight_kg,
                up.bmi,
                up.chronic_conditions,
                up.known_allergies
            FROM user_profiles up
            WHERE up.user_id = :user_id
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        row = result.mappings().first()
        if row:
            d = dict(row)
            if d.get("date_of_birth"):
                age = (date.today() - d["date_of_birth"]).days // 365
                d["age"] = age
            return d
        return {}

    async def _get_recent_records(self, user_id: UUID, days: int = 90) -> list:
        cutoff = date.today() - timedelta(days=days)
        sql = text("""
            SELECT title, record_type, record_date, ai_summary, ai_risk_flags, hospital_name
            FROM health_records
            WHERE user_id = :user_id
              AND record_date >= :cutoff
              AND is_archived = false
            ORDER BY record_date DESC
            LIMIT 20
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id), "cutoff": cutoff})
        return [dict(r) for r in result.mappings().all()]
