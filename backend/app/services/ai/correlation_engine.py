"""
HealthWeave – Medical Correlation Engine
Identifies longitudinal patterns, risk trends, and cross-domain correlations
across a patient's lifetime health data.
"""

import json
import logging
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_client import LLMClient, get_llm_client

logger = logging.getLogger(__name__)


CORRELATION_SYSTEM = """You are a medical informatics AI specializing in longitudinal health pattern analysis.

Your task is to analyze a patient's structured health data and identify meaningful correlations, patterns, and trends.

Rules:
- Report PATTERNS and TRENDS, not diagnoses
- Quantify where possible (e.g., "HbA1c increased 12% over 18 months")
- Flag clinically significant trends with appropriate urgency
- Suggest preventive actions, not treatments
- Include confidence levels for each finding
- Never claim certainty — use probabilistic language
- Always recommend professional consultation for significant findings
"""


class CorrelationEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    async def run_full_correlation(self, user_id: UUID) -> list[dict]:
        """
        Main entry point — runs all correlation analyses for a user
        and returns a ranked list of findings.
        """
        findings = []

        biomarker_findings = await self._correlate_biomarker_trends(user_id)
        findings.extend(biomarker_findings)

        metabolic_finding = await self._detect_metabolic_syndrome_risk(user_id)
        if metabolic_finding:
            findings.append(metabolic_finding)

        progression_findings = await self._detect_disease_progression(user_id)
        findings.extend(progression_findings)

        medicine_findings = await self._correlate_medicine_with_biomarkers(user_id)
        findings.extend(medicine_findings)

        return sorted(findings, key=lambda x: x.get("priority", 0), reverse=True)

    async def _correlate_biomarker_trends(self, user_id: UUID) -> list[dict]:
        """Detect statistically significant trends in biomarker time series."""
        sql = text("""
            WITH ranked AS (
                SELECT
                    canonical_name,
                    value_numeric,
                    measured_at,
                    status,
                    ROW_NUMBER() OVER (PARTITION BY canonical_name ORDER BY measured_at) AS rn,
                    COUNT(*) OVER (PARTITION BY canonical_name) AS total_readings
                FROM biomarker_values
                WHERE user_id = :user_id
                  AND value_numeric IS NOT NULL
                  AND canonical_name IS NOT NULL
            )
            SELECT
                canonical_name,
                array_agg(value_numeric ORDER BY measured_at) AS values,
                array_agg(measured_at ORDER BY measured_at) AS dates,
                array_agg(status ORDER BY measured_at) AS statuses,
                total_readings,
                MIN(measured_at) AS first_date,
                MAX(measured_at) AS last_date
            FROM ranked
            WHERE total_readings >= 2
            GROUP BY canonical_name, total_readings
            ORDER BY total_readings DESC
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        biomarkers = result.mappings().all()

        if not biomarkers:
            return []

        # Build data payload for LLM analysis
        biomarker_data = []
        for bm in biomarkers:
            values = bm["values"]
            first_val = values[0] if values else None
            last_val = values[-1] if values else None
            if first_val and last_val and first_val != 0:
                change_pct = ((last_val - first_val) / abs(first_val)) * 100
            else:
                change_pct = 0

            biomarker_data.append({
                "name": bm["canonical_name"],
                "readings": list(zip([str(d) for d in bm["dates"]], bm["values"])),
                "statuses": bm["statuses"],
                "change_percent": round(change_pct, 1),
                "readings_count": bm["total_readings"],
                "span_days": (bm["last_date"] - bm["first_date"]).days,
            })

        prompt = f"""Analyze these biomarker trends for a patient and identify significant patterns.

Biomarker Data:
{json.dumps(biomarker_data, indent=2)}

For each significant finding:
1. Name the pattern (e.g., "Progressive HbA1c elevation")
2. Describe the trend with numbers
3. Rate clinical significance: low/moderate/high/critical
4. Explain what this pattern may indicate (as risk indicator, not diagnosis)
5. Suggest preventive action

Return as JSON array of findings with fields:
[{{
    "title": "...",
    "description": "...",
    "biomarkers_involved": ["..."],
    "significance": "low|moderate|high|critical",
    "trend_direction": "improving|stable|worsening|fluctuating",
    "change_summary": "...",
    "preventive_suggestion": "...",
    "confidence": 0.0-1.0,
    "priority": 1-10
}}]
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=CORRELATION_SYSTEM,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            findings = json.loads(raw)
            for f in findings:
                f["finding_type"] = "biomarker_correlation"
            return findings
        except Exception as exc:
            logger.warning("Could not parse biomarker correlation findings: %s", exc)
            return []

    async def _detect_metabolic_syndrome_risk(self, user_id: UUID) -> dict | None:
        """Check for metabolic syndrome markers: glucose, lipids, BP, waist."""
        sql = text("""
            SELECT DISTINCT ON (canonical_name)
                canonical_name, value_numeric, status, measured_at
            FROM biomarker_values
            WHERE user_id = :user_id
              AND canonical_name IN (
                  'fasting_glucose', 'hba1c', 'triglycerides',
                  'hdl_cholesterol', 'ldl_cholesterol', 'total_cholesterol',
                  'systolic_bp', 'diastolic_bp', 'bmi'
              )
            ORDER BY canonical_name, measured_at DESC
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        markers = {row["canonical_name"]: row for row in result.mappings().all()}

        if len(markers) < 3:
            return None

        risk_factors = []
        if markers.get("fasting_glucose") and markers["fasting_glucose"]["value_numeric"] > 100:
            risk_factors.append("elevated fasting glucose")
        if markers.get("hba1c") and markers["hba1c"]["value_numeric"] > 5.7:
            risk_factors.append("elevated HbA1c")
        if markers.get("triglycerides") and markers["triglycerides"]["value_numeric"] > 150:
            risk_factors.append("elevated triglycerides")
        if markers.get("hdl_cholesterol") and markers["hdl_cholesterol"]["value_numeric"] < 40:
            risk_factors.append("low HDL")
        if markers.get("systolic_bp") and markers["systolic_bp"]["value_numeric"] > 130:
            risk_factors.append("elevated blood pressure")

        if len(risk_factors) < 2:
            return None

        return {
            "finding_type": "metabolic_syndrome_risk",
            "title": "Metabolic Syndrome Risk Pattern",
            "description": f"Multiple metabolic risk indicators present: {', '.join(risk_factors)}",
            "biomarkers_involved": list(markers.keys()),
            "significance": "high" if len(risk_factors) >= 3 else "moderate",
            "trend_direction": "worsening",
            "change_summary": f"{len(risk_factors)} of 5 metabolic syndrome criteria elevated",
            "preventive_suggestion": "Consider cardio-metabolic risk assessment with your physician. Lifestyle interventions including diet and exercise have strong evidence for reversing metabolic syndrome.",
            "confidence": 0.85,
            "priority": 8,
        }

    async def _detect_disease_progression(self, user_id: UUID) -> list[dict]:
        """Detect chronic disease progression patterns from ICD codes and biomarker trends."""
        sql = text("""
            SELECT
                hr.record_date,
                hr.icd10_codes,
                hr.ai_tags,
                hr.ai_risk_flags,
                hr.record_type
            FROM health_records hr
            WHERE hr.user_id = :user_id
              AND (
                  cardinality(hr.icd10_codes) > 0
                  OR cardinality(hr.ai_risk_flags) > 0
              )
            ORDER BY hr.record_date
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        records = result.mappings().all()

        if not records:
            return []

        icd_timeline: dict[str, list[str]] = {}
        for rec in records:
            for code in (rec["icd10_codes"] or []):
                icd_timeline.setdefault(code, []).append(str(rec["record_date"]))

        progression_findings = []
        for icd_code, dates in icd_timeline.items():
            if len(dates) >= 2:
                progression_findings.append({
                    "finding_type": "disease_progression",
                    "title": f"Recurring condition: ICD-10 {icd_code}",
                    "description": f"Condition appeared in {len(dates)} records spanning {dates[0]} to {dates[-1]}",
                    "biomarkers_involved": [],
                    "significance": "moderate",
                    "trend_direction": "stable",
                    "change_summary": f"{len(dates)} occurrences",
                    "preventive_suggestion": "Discuss long-term management plan with your specialist.",
                    "confidence": 0.7,
                    "priority": 5,
                })

        return progression_findings

    async def _correlate_medicine_with_biomarkers(self, user_id: UUID) -> list[dict]:
        """Find biomarker changes coinciding with medicine start/stop events."""
        sql = text("""
            SELECT
                me.canonical_name AS medicine,
                me.start_date,
                me.end_date,
                me.status,
                bv.canonical_name AS biomarker,
                bv.value_numeric,
                bv.measured_at,
                bv.status AS bm_status
            FROM medicine_entries me
            JOIN biomarker_values bv ON bv.user_id = me.user_id
            WHERE me.user_id = :user_id
              AND me.canonical_name IS NOT NULL
              AND me.start_date IS NOT NULL
            ORDER BY me.start_date, bv.measured_at
            LIMIT 200
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        rows = result.mappings().all()

        if not rows:
            return []

        # Group data and let LLM find meaningful correlations
        prompt = f"""Given this patient's medication and biomarker timeline, identify any significant correlations.

Data (medicine start dates with related biomarker readings before and after):
{json.dumps([dict(r) for r in rows[:50]], default=str, indent=2)}

Identify cases where:
1. A biomarker improved after starting a medicine (positive effect)
2. A biomarker worsened after starting a medicine (possible side effect)
3. A biomarker worsened after stopping a medicine (dependency pattern)

Return JSON array:
[{{
    "medicine": "...",
    "biomarker": "...",
    "correlation_type": "positive_effect|side_effect|dependency|no_correlation",
    "description": "...",
    "confidence": 0.0-1.0,
    "priority": 1-10
}}]
"""
        response = await self.llm.complete(
            prompt=prompt,
            system=CORRELATION_SYSTEM,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            findings = json.loads(raw)
            for f in findings:
                f["finding_type"] = "medicine_biomarker_correlation"
                f.setdefault("significance", "moderate")
                f.setdefault("biomarkers_involved", [f.get("biomarker", "")])
                f.setdefault("trend_direction", "stable")
                f.setdefault("change_summary", f["description"])
                f.setdefault("preventive_suggestion", "Discuss with your prescribing physician.")
            return findings
        except Exception as exc:
            logger.warning("Could not parse medicine correlation findings: %s", exc)
            return []
