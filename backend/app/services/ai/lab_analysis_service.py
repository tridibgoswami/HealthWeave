"""
HealthWeave – Comprehensive Lab Analysis Service
Deep clinical interpretation, historical comparison, pattern recognition, and
specialization-aware doctor summaries.
NOT a diagnostic system — risk indicators and informational analysis only.
"""

import json
import logging
from typing import Optional
from uuid import UUID
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_client import get_llm_client
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Specialization → relevant panel mapping ───────────────────────────────────

SPECIALIZATION_FOCUS = {
    "cardiologist": {
        "panels": ["lipid", "cardiac_risk", "homocysteine", "hs_crp", "lp_a", "apo"],
        "biomarkers": ["total_cholesterol", "ldl_cholesterol", "hdl_cholesterol",
                       "triglycerides", "homocysteine", "hs_crp", "lp_a",
                       "apo_b", "apo_a1", "non_hdl_cholesterol", "vldl_cholesterol"],
        "focus": "Cardiovascular risk — lipids, inflammatory markers, cardiac biomarkers",
    },
    "endocrinologist": {
        "panels": ["thyroid", "diabetes", "hormones", "vitamin_d", "calcium"],
        "biomarkers": ["tsh", "ft3", "ft4", "t3_total", "t4_total",
                       "fasting_glucose", "hba1c", "testosterone", "vitamin_d",
                       "insulin", "cortisol", "calcium", "phosphorous"],
        "focus": "Endocrine function — thyroid, glucose metabolism, hormones, bone metabolism",
    },
    "diabetologist": {
        "panels": ["diabetes", "lipid", "kidney", "liver"],
        "biomarkers": ["fasting_glucose", "postprandial_glucose", "hba1c",
                       "average_blood_glucose", "insulin", "c_peptide",
                       "triglycerides", "hdl_cholesterol", "creatinine",
                       "egfr", "urine_microalbumin", "alt", "ast"],
        "focus": "Diabetes management — glycemic control, complications screening",
    },
    "nephrologist": {
        "panels": ["kidney", "electrolytes", "blood_count"],
        "biomarkers": ["creatinine", "egfr", "blood_urea_nitrogen", "urea",
                       "uric_acid", "sodium", "potassium", "chloride",
                       "calcium", "phosphorous", "magnesium",
                       "urine_protein", "urine_creatinine"],
        "focus": "Renal function — GFR, electrolytes, acid-base balance",
    },
    "gastroenterologist": {
        "panels": ["liver", "kidney"],
        "biomarkers": ["alt", "ast", "ggt", "alkaline_phosphatase",
                       "bilirubin_total", "bilirubin_direct",
                       "protein_total", "albumin", "globulin",
                       "sgot_sgpt_ratio", "cea"],
        "focus": "Hepatic and GI — liver enzymes, synthetic function, tumor markers",
    },
    "hematologist": {
        "panels": ["cbc", "iron", "vitamins"],
        "biomarkers": ["hemoglobin", "hematocrit", "red_blood_cells", "mcv",
                       "mch", "mchc", "rdw_cv", "rdw_sd",
                       "white_blood_cells", "platelets", "neutrophils",
                       "lymphocytes", "iron", "tibc", "transferrin_saturation",
                       "ferritin", "vitamin_b12", "folate"],
        "focus": "Hematology — anemia workup, CBC differential, iron/B12/folate",
    },
    "rheumatologist": {
        "panels": ["autoimmune", "inflammatory"],
        "biomarkers": ["ana", "anti_ccp", "rheumatoid_factor", "hs_crp",
                       "c_reactive_protein", "esr", "uric_acid",
                       "complement_c3", "complement_c4"],
        "focus": "Autoimmune and inflammatory markers, joint disease",
    },
    "general_physician": {
        "panels": ["all"],
        "biomarkers": [],
        "focus": "Complete overview — all abnormal values, risk summary, action items",
    },
    "urologist": {
        "panels": ["kidney", "prostate", "hormones"],
        "biomarkers": ["psa", "free_psa", "testosterone", "creatinine",
                       "egfr", "uric_acid", "urine_analysis"],
        "focus": "Prostate, testosterone, renal markers",
    },
}

ANALYSIS_SYSTEM = """You are a senior clinical laboratory medicine specialist providing AI-assisted
health intelligence. You interpret lab results with clinical depth, pattern recognition, and
evidence-based guidance.

CRITICAL RULES:
- NEVER say "you have X disease" — say "findings suggest", "consistent with", "risk indicators for"
- Always use probabilistic clinical language
- Cross-correlate markers — do not interpret each in isolation
- Identify patterns (e.g., high TG + low HDL + elevated liver enzymes = metabolic syndrome pattern)
- Quantify risk (mild/moderate/severe/critical)
- Always recommend physician consultation
- For Indian patients: consider common deficiencies (Vitamin D, B12, folate, iron)
- Medical disclaimer always applies
"""


class LabAnalysisService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_comprehensive_analysis(
        self,
        user_id: UUID,
        record_id: str,
        biomarkers: list[dict],
    ) -> dict:
        """
        Full analysis for a just-uploaded lab report:
        - Clinical interpretation per panel
        - Historical comparison for each biomarker
        - Pattern recognition (metabolic syndrome, NAFLD, etc.)
        - Risk summary
        - Actionable recommendations
        """
        history = await self._get_biomarker_history(user_id, biomarkers)
        profile = await self._get_profile(user_id)

        prompt = _build_analysis_prompt(biomarkers, history, profile)

        response = await self.llm.complete(
            prompt=prompt,
            system=ANALYSIS_SYSTEM,
            max_tokens=4096,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            result = json.loads(raw)
        except Exception as exc:
            logger.warning("Lab analysis parse error: %s", exc)
            result = {"error": "Analysis parse failed", "raw": response.content[:500]}

        result["medical_disclaimer"] = settings.MEDICAL_DISCLAIMER
        return result

    async def generate_doctor_summary(
        self,
        user_id: UUID,
        specialization: Optional[str] = None,
        days_back: int = 180,
    ) -> dict:
        """
        Pre-consultation summary tailored to the doctor's specialization.
        Filters biomarkers and panels relevant to that specialty.
        """
        spec_key = _normalize_specialization(specialization)
        spec_config = SPECIALIZATION_FOCUS.get(spec_key, SPECIALIZATION_FOCUS["general_physician"])

        biomarkers = await self._get_recent_biomarkers(user_id, days_back, spec_config)
        medicines = await self._get_medicines(user_id)
        profile = await self._get_profile(user_id)
        trends = await self._compute_trends(user_id, spec_config["biomarkers"])

        prompt = _build_doctor_summary_prompt(
            biomarkers=biomarkers,
            medicines=medicines,
            profile=profile,
            trends=trends,
            specialization=specialization or "General Physician",
            focus=spec_config["focus"],
        )

        response = await self.llm.complete(
            prompt=prompt,
            system=ANALYSIS_SYSTEM,
            max_tokens=settings.MAX_TOKENS_SUMMARY,
            inject_disclaimer=False,
        )

        try:
            raw = response.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            result = json.loads(raw)
        except Exception:
            result = {"summary_text": response.content}

        result["specialization"] = specialization or "General Physician"
        result["medical_disclaimer"] = settings.MEDICAL_DISCLAIMER
        return result

    async def compare_test_over_time(
        self,
        user_id: UUID,
        biomarker_name: str,
    ) -> dict:
        """
        Full longitudinal analysis for a single biomarker across ALL records.
        Detects trend direction, rate of change, status transitions, and prediction.
        """
        sql = text("""
            SELECT
                bv.canonical_name,
                bv.value_numeric,
                bv.unit,
                bv.status,
                bv.measured_at,
                bv.reference_range_text,
                bv.reference_range_low,
                bv.reference_range_high,
                hr.hospital_name,
                hr.doctor_name,
                hr.title as report_title
            FROM biomarker_values bv
            JOIN health_records hr ON hr.id = bv.record_id
            WHERE bv.user_id = :uid
              AND bv.canonical_name = :name
              AND bv.value_numeric IS NOT NULL
            ORDER BY bv.measured_at ASC
        """)
        result = await self.db.execute(sql, {"uid": str(user_id), "name": biomarker_name})
        rows = [dict(r) for r in result.mappings().all()]

        if not rows:
            return {"biomarker": biomarker_name, "readings": [], "trend": "no_data"}

        if len(rows) == 1:
            return {
                "biomarker": biomarker_name,
                "readings": rows,
                "trend": "single_reading",
                "note": "Upload more reports over time to see trends.",
            }

        # Compute trend stats
        values = [r["value_numeric"] for r in rows]
        first_val = values[0]
        last_val = values[-1]
        delta = round(last_val - first_val, 3)
        delta_pct = round((delta / first_val * 100) if first_val != 0 else 0, 1)

        # Status transitions
        statuses = [r["status"] for r in rows if r["status"]]
        status_changed = len(set(statuses)) > 1

        # AI interpretation for trends with ≥2 points
        trend_interpretation = await self._interpret_trend(
            biomarker_name, rows, delta, delta_pct
        )

        return {
            "biomarker": biomarker_name,
            "readings": rows,
            "summary": {
                "first_reading": {"value": first_val, "date": str(rows[0]["measured_at"])},
                "latest_reading": {"value": last_val, "date": str(rows[-1]["measured_at"])},
                "total_readings": len(rows),
                "delta": delta,
                "delta_pct": delta_pct,
                "trend_direction": "improving" if _is_improving(biomarker_name, delta) else "worsening" if delta != 0 else "stable",
                "status_changed": status_changed,
                "unit": rows[-1]["unit"],
            },
            "interpretation": trend_interpretation,
            "medical_disclaimer": settings.MEDICAL_DISCLAIMER,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_biomarker_history(self, user_id: UUID, current_biomarkers: list[dict]) -> dict:
        """For each biomarker in the current report, fetch all previous readings."""
        names = [b.get("canonical_name") for b in current_biomarkers if b.get("canonical_name")]
        if not names:
            return {}

        sql = text("""
            SELECT canonical_name, value_numeric, unit, status, measured_at
            FROM biomarker_values
            WHERE user_id = :uid
              AND canonical_name = ANY(:names)
              AND value_numeric IS NOT NULL
            ORDER BY canonical_name, measured_at ASC
        """)
        result = await self.db.execute(sql, {"uid": str(user_id), "names": names})
        rows = result.mappings().all()

        history: dict[str, list] = {}
        for row in rows:
            name = row["canonical_name"]
            history.setdefault(name, []).append({
                "value": row["value_numeric"],
                "unit": row["unit"],
                "status": row["status"],
                "date": str(row["measured_at"]),
            })
        return history

    async def _get_recent_biomarkers(
        self,
        user_id: UUID,
        days_back: int,
        spec_config: dict,
    ) -> list[dict]:
        cutoff = date.today() - timedelta(days=days_back)
        biomarker_filter = spec_config.get("biomarkers", [])

        if biomarker_filter:
            sql = text("""
                SELECT bv.canonical_name, bv.value_numeric, bv.unit,
                       bv.status, bv.measured_at, bv.reference_range_text
                FROM biomarker_values bv
                WHERE bv.user_id = :uid
                  AND bv.measured_at >= :cutoff
                  AND bv.canonical_name = ANY(:names)
                ORDER BY bv.canonical_name, bv.measured_at DESC
            """)
            result = await self.db.execute(sql, {
                "uid": str(user_id), "cutoff": cutoff, "names": biomarker_filter,
            })
        else:
            sql = text("""
                SELECT bv.canonical_name, bv.value_numeric, bv.unit,
                       bv.status, bv.measured_at, bv.reference_range_text
                FROM biomarker_values bv
                WHERE bv.user_id = :uid
                  AND bv.measured_at >= :cutoff
                ORDER BY bv.canonical_name, bv.measured_at DESC
                LIMIT 80
            """)
            result = await self.db.execute(sql, {"uid": str(user_id), "cutoff": cutoff})

        return [dict(r) for r in result.mappings().all()]

    async def _get_medicines(self, user_id: UUID) -> list[dict]:
        sql = text("""
            SELECT canonical_name, dosage, frequency, status, prescribed_for
            FROM medicine_entries
            WHERE user_id = :uid AND status = 'active'
            ORDER BY prescribed_date DESC LIMIT 20
        """)
        result = await self.db.execute(sql, {"uid": str(user_id)})
        return [dict(r) for r in result.mappings().all()]

    async def _get_profile(self, user_id: UUID) -> dict:
        sql = text("""
            SELECT up.first_name, up.date_of_birth, up.gender,
                   up.blood_group, up.height_cm, up.weight_kg, up.bmi,
                   up.chronic_conditions, up.known_allergies,
                   up.family_history
            FROM user_profiles up WHERE up.user_id = :uid
        """)
        result = await self.db.execute(sql, {"uid": str(user_id)})
        row = result.mappings().first()
        if not row:
            return {}
        d = dict(row)
        if d.get("date_of_birth"):
            d["age"] = (date.today() - d["date_of_birth"]).days // 365
        return d

    async def _compute_trends(self, user_id: UUID, biomarker_names: list[str]) -> list[dict]:
        """Compute trend direction for listed biomarkers (last 2 readings each)."""
        if not biomarker_names:
            return []
        sql = text("""
            SELECT DISTINCT ON (canonical_name)
                   canonical_name, value_numeric, status, measured_at,
                   LAG(value_numeric) OVER (PARTITION BY canonical_name ORDER BY measured_at) AS prev_value,
                   LAG(measured_at)   OVER (PARTITION BY canonical_name ORDER BY measured_at) AS prev_date
            FROM biomarker_values
            WHERE user_id = :uid AND canonical_name = ANY(:names) AND value_numeric IS NOT NULL
            ORDER BY canonical_name, measured_at DESC
        """)
        result = await self.db.execute(sql, {"uid": str(user_id), "names": biomarker_names})
        trends = []
        for row in result.mappings().all():
            if row["value_numeric"] and row["prev_value"]:
                delta = row["value_numeric"] - row["prev_value"]
                trends.append({
                    "biomarker": row["canonical_name"],
                    "current": row["value_numeric"],
                    "previous": row["prev_value"],
                    "delta": round(delta, 3),
                    "delta_pct": round(delta / row["prev_value"] * 100, 1) if row["prev_value"] else 0,
                    "current_date": str(row["measured_at"]),
                    "previous_date": str(row["prev_date"]) if row["prev_date"] else None,
                    "status": row["status"],
                    "direction": "worsening" if delta > 0 else "improving" if delta < 0 else "stable",
                })
        return trends

    async def _interpret_trend(
        self,
        biomarker_name: str,
        readings: list[dict],
        delta: float,
        delta_pct: float,
    ) -> str:
        prompt = f"""Interpret this biomarker trend for a patient. Be concise (3-4 sentences).

Biomarker: {biomarker_name}
Readings over time: {json.dumps([{
    "date": r["measured_at"] if isinstance(r["measured_at"], str) else str(r["measured_at"]),
    "value": r["value_numeric"],
    "status": r["status"],
    "unit": r["unit"],
} for r in readings], default=str)}
Total change: {delta:+.2f} ({delta_pct:+.1f}%)

Provide: trend direction, clinical significance of the change, whether this is concerning,
and one concrete preventive action. Use plain language the patient can understand."""

        response = await self.llm.complete(
            prompt=prompt,
            system=ANALYSIS_SYSTEM,
            max_tokens=400,
            inject_disclaimer=False,
        )
        return response.content.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Prompt builders
# ─────────────────────────────────────────────────────────────────────────────

def _build_analysis_prompt(
    biomarkers: list[dict],
    history: dict,
    profile: dict,
) -> str:
    # Separate abnormal from normal
    abnormal = [b for b in biomarkers if b.get("status") in ("high", "low", "critical")]
    normal = [b for b in biomarkers if b.get("status") == "normal"]

    history_summary = []
    for bm in abnormal:
        name = bm.get("canonical_name", "")
        prev = history.get(name, [])
        if prev:
            history_summary.append({
                "biomarker": name,
                "current": bm.get("value_numeric"),
                "unit": bm.get("unit"),
                "previous_readings": prev[-3:],
            })

    return f"""Generate a comprehensive clinical analysis for this lab report.

Patient Context:
{json.dumps(profile, default=str)}

ABNORMAL VALUES ({len(abnormal)} findings):
{json.dumps(abnormal, indent=2)}

NORMAL VALUES (summary):
{len(normal)} values within range

HISTORICAL COMPARISON for abnormal markers:
{json.dumps(history_summary, indent=2, default=str)}

Return JSON with this structure:
{{
    "overall_status": "action_required|monitor|satisfactory",
    "headline": "One sentence — the most important finding in plain English",

    "panel_analysis": [
        {{
            "panel": "Lipid Profile",
            "status": "critical|high_risk|borderline|normal",
            "findings": [
                {{
                    "marker": "Triglycerides",
                    "value": 554,
                    "unit": "mg/dL",
                    "status": "critical",
                    "interpretation": "Severely elevated at 554 mg/dL (normal <150). This level carries risk of pancreatitis.",
                    "vs_previous": "First reading — no comparison available" or "Up 12% from last test (492 mg/dL in Jan 2025)"
                }}
            ],
            "panel_interpretation": "2-3 sentences on what this panel means together",
            "panel_action": "Specific action for this panel"
        }}
    ],

    "pattern_recognition": [
        {{
            "pattern": "Metabolic Syndrome",
            "confidence": "high|moderate|low",
            "supporting_markers": ["triglycerides", "hdl_cholesterol", "sgpt"],
            "explanation": "The combination of severely elevated triglycerides (554), low HDL (36), and elevated liver enzymes points strongly to metabolic syndrome with possible NAFLD.",
            "risk_level": "high"
        }}
    ],

    "priority_actions": [
        {{
            "priority": 1,
            "action": "Urgent cardiology/endocrinology review for severe hypertriglyceridemia",
            "reason": "TG of 554 mg/dL carries pancreatitis risk and requires medication",
            "timeframe": "Within 1 week"
        }}
    ],

    "positive_findings": ["Normal thyroid function", "Excellent kidney function (eGFR 108)"],

    "lifestyle_recommendations": [
        {{
            "category": "Diet",
            "recommendation": "Eliminate refined sugar and alcohol — primary drivers of high triglycerides",
            "evidence_basis": "Strong evidence"
        }}
    ],

    "follow_up_tests": [
        {{
            "test": "Fasting Insulin + HOMA-IR",
            "reason": "TG/HDL ratio of 15.55 suggests insulin resistance — confirm with insulin levels",
            "urgency": "within_1_month"
        }}
    ],

    "patient_summary": "Plain-language 4-5 sentence summary the patient can understand. Start with the most important concern.",
    "data_completeness": 0.0-1.0
}}"""


def _build_doctor_summary_prompt(
    biomarkers: list[dict],
    medicines: list[dict],
    profile: dict,
    trends: list[dict],
    specialization: str,
    focus: str,
) -> str:
    return f"""Generate a pre-consultation clinical summary for a {specialization}.
Focus: {focus}

Patient Profile:
{json.dumps(profile, default=str)}

Relevant Biomarkers (last 6 months):
{json.dumps(biomarkers, default=str, indent=2)[:3000]}

Biomarker Trends (change from previous reading):
{json.dumps(trends, default=str, indent=2)[:1500]}

Active Medications:
{json.dumps(medicines, default=str)[:800]}

Return JSON:
{{
    "patient_snapshot": "2-sentence patient overview relevant to {specialization}",
    "key_findings": [
        {{
            "finding": "Finding title",
            "value": "e.g. Triglycerides 554 mg/dL",
            "significance": "Clinical significance for this specialty",
            "trend": "worsening|improving|stable|new_finding"
        }}
    ],
    "abnormal_relevant": [
        {{
            "marker": "name",
            "value": "value + unit",
            "reference": "normal range",
            "trend": "↑ 12% from last test" or "First reading"
        }}
    ],
    "active_medications_relevant": ["only meds relevant to this specialty"],
    "questions_to_ask": ["3-4 focused questions the {specialization} should consider asking"],
    "suggested_next_steps": ["3-4 next steps specific to this specialty"],
    "specialist_note": "One paragraph free text summary for the {specialization}"
}}"""


# ─────────────────────────────────────────────────────────────────────────────
# Utility functions
# ─────────────────────────────────────────────────────────────────────────────

# Biomarkers where a DECREASE is worsening (lower is worse)
_LOWER_IS_WORSE = {
    "hdl_cholesterol", "hemoglobin", "vitamin_d", "vitamin_b12", "folate",
    "ferritin", "albumin", "egfr", "platelets", "testosterone",
    "transferrin_saturation",
}


def _is_improving(biomarker_name: str, delta: float) -> bool:
    name = biomarker_name.lower()
    if name in _LOWER_IS_WORSE:
        return delta > 0
    return delta < 0


def _normalize_specialization(specialization: Optional[str]) -> str:
    if not specialization:
        return "general_physician"
    s = specialization.lower().strip()
    mapping = {
        "cardiology": "cardiologist", "cardiac": "cardiologist",
        "endocrinology": "endocrinologist", "endocrine": "endocrinologist",
        "diabetes": "diabetologist", "diabetology": "diabetologist",
        "nephrology": "nephrologist", "renal": "nephrologist",
        "gastroenterology": "gastroenterologist", "hepatology": "gastroenterologist",
        "hematology": "hematologist",
        "rheumatology": "rheumatologist",
        "urology": "urologist",
        "general": "general_physician", "gp": "general_physician",
        "internal medicine": "general_physician",
    }
    for key, val in mapping.items():
        if key in s:
            return val
    return s if s in SPECIALIZATION_FOCUS else "general_physician"
