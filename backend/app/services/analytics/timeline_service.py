"""
HealthWeave – Health Timeline Service
Builds and queries the longitudinal health timeline.
"""

import json
import logging
from datetime import date
from uuid import UUID

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health_record import HealthRecord, TimelineEvent
from app.services.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)


class TimelineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    async def get_full_timeline(
        self,
        user_id: UUID,
        year: int | None = None,
        event_types: list[str] | None = None,
        limit: int = 200,
    ) -> dict:
        """
        Return the full timeline grouped by year, with AI-generated year summaries.
        """
        query_parts = ["WHERE te.user_id = :user_id"]
        params: dict = {"user_id": str(user_id)}

        if year:
            query_parts.append("AND te.year = :year")
            params["year"] = year

        if event_types:
            query_parts.append("AND te.event_type = ANY(:event_types)")
            params["event_types"] = event_types

        sql = text(f"""
            SELECT
                te.id,
                te.event_date,
                te.year,
                te.month,
                te.event_type,
                te.event_title,
                te.event_summary,
                te.event_icon,
                te.severity,
                te.tags,
                te.ai_insight,
                te.is_milestone,
                te.record_id
            FROM timeline_events te
            {' '.join(query_parts)}
            ORDER BY te.event_date DESC
            LIMIT :limit
        """)
        params["limit"] = limit

        result = await self.db.execute(sql, params)
        events = [dict(row) for row in result.mappings().all()]

        # Group by year
        timeline: dict[int, dict] = {}
        for event in events:
            yr = event["year"]
            if yr not in timeline:
                timeline[yr] = {"year": yr, "events": [], "summary": None}
            event["event_date"] = str(event["event_date"])
            timeline[yr]["events"].append(event)

        # Get year summaries
        year_sql = text("""
            SELECT year, ai_year_summary
            FROM timeline_year_summaries
            WHERE user_id = :user_id
              AND year = ANY(:years)
        """)
        years_list = list(timeline.keys())
        if years_list:
            try:
                yr_result = await self.db.execute(
                    year_sql,
                    {"user_id": str(user_id), "years": years_list},
                )
                for row in yr_result.mappings().all():
                    if row["year"] in timeline:
                        timeline[row["year"]]["summary"] = row["ai_year_summary"]
            except Exception:
                pass  # Table may not exist yet

        return {
            "years": sorted(timeline.values(), key=lambda x: x["year"], reverse=True),
            "total_events": len(events),
        }

    async def create_timeline_event_from_record(self, record: HealthRecord) -> TimelineEvent:
        """Auto-generate a timeline event when a health record is created."""
        event_type_map = {
            "lab_report": "lab_test",
            "prescription": "medication",
            "scan": "imaging",
            "discharge_summary": "hospitalization",
            "vaccination": "vaccination",
            "doctor_visit": "consultation",
            "surgery": "surgery",
            "symptom_log": "symptom",
            "vital_reading": "vital",
            "health_package": "checkup",
        }

        severity_map = {
            "critical": "critical",
            "abnormal": "warning",
            "normal": "info",
            "improved": "improvement",
        }

        event_type = event_type_map.get(record.record_type, "general")
        severity = "info"
        if record.ai_risk_flags:
            severity = "warning"

        # Ask AI for a concise timeline insight
        insight = await self._generate_event_insight(record)

        event = TimelineEvent(
            user_id=record.user_id,
            record_id=record.id,
            event_date=record.record_date,
            year=record.record_date.year,
            month=record.record_date.month,
            event_type=event_type,
            event_title=record.title,
            event_summary=record.ai_summary,
            event_icon=event_type,
            severity=severity,
            tags=record.ai_tags or [],
            ai_insight=insight,
            is_milestone=len(record.ai_risk_flags or []) > 0,
        )

        self.db.add(event)
        return event

    async def generate_year_summary(self, user_id: UUID, year: int) -> str:
        """Generate an AI narrative summary of a health year."""
        sql = text("""
            SELECT
                te.event_title,
                te.event_type,
                te.event_date,
                te.severity,
                te.ai_insight,
                hr.ai_extracted_biomarkers,
                hr.ai_risk_flags
            FROM timeline_events te
            LEFT JOIN health_records hr ON hr.id = te.record_id
            WHERE te.user_id = :user_id AND te.year = :year
            ORDER BY te.event_date
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id), "year": year})
        events = [dict(r) for r in result.mappings().all()]

        if not events:
            return f"No health records found for {year}."

        prompt = f"""Summarize this patient's health year {year} in 3-4 sentences.

Events in {year}:
{json.dumps(events, default=str, indent=2)[:2000]}

Write a warm, easy-to-understand summary highlighting:
- Key health events
- Significant changes or milestones
- Overall health direction for the year
- Any patterns worth noting

Write in second person ("Your health in 2023 showed...").
"""
        response = await self.llm.complete(
            prompt=prompt,
            inject_disclaimer=False,
            max_tokens=512,
        )
        return response.content

    async def _generate_event_insight(self, record: HealthRecord) -> str | None:
        """1-sentence AI insight for a timeline event."""
        if not record.ai_summary:
            return None

        prompt = f"""Write a single-sentence insight for this health event to show in a patient's timeline.

Event: {record.title}
Date: {record.record_date}
Type: {record.record_type}
Summary: {record.ai_summary}
Risk flags: {record.ai_risk_flags}

One sentence, plain language, empathetic tone. Do not diagnose.
"""
        try:
            response = await self.llm.complete(
                prompt=prompt,
                inject_disclaimer=False,
                max_tokens=100,
            )
            return response.content.strip()
        except Exception:
            return None

    async def compare_reports(
        self,
        user_id: UUID,
        record_id_1: UUID,
        record_id_2: UUID,
    ) -> dict:
        """AI-powered comparison of two health reports."""
        sql = text("""
            SELECT
                hr.title, hr.record_date, hr.record_type, hr.ai_summary,
                hr.ai_extracted_biomarkers, hr.hospital_name,
                array_agg(bv.canonical_name || ': ' || bv.value_numeric::text || ' ' || COALESCE(bv.unit, '')) AS biomarker_list
            FROM health_records hr
            LEFT JOIN biomarker_values bv ON bv.record_id = hr.id
            WHERE hr.id = ANY(:ids) AND hr.user_id = :user_id
            GROUP BY hr.id, hr.title, hr.record_date, hr.record_type, hr.ai_summary, hr.ai_extracted_biomarkers, hr.hospital_name
        """)
        result = await self.db.execute(
            sql,
            {"ids": [str(record_id_1), str(record_id_2)], "user_id": str(user_id)},
        )
        records = [dict(r) for r in result.mappings().all()]

        if len(records) != 2:
            return {"error": "One or both records not found"}

        records.sort(key=lambda x: x["record_date"])
        older, newer = records[0], records[1]

        prompt = f"""Compare these two medical reports and highlight changes.

Report 1 ({older['record_date']} — {older['title']}):
Biomarkers: {older.get('biomarker_list', [])}
Summary: {older.get('ai_summary', 'N/A')}

Report 2 ({newer['record_date']} — {newer['title']}):
Biomarkers: {newer.get('biomarker_list', [])}
Summary: {newer.get('ai_summary', 'N/A')}

Provide:
1. Values that improved
2. Values that worsened
3. Values unchanged
4. New findings in newer report
5. Overall health direction assessment
6. Recommended follow-up actions

Use simple language. Include actual numbers where available.
"""
        response = await self.llm.complete(prompt=prompt, inject_disclaimer=True)

        return {
            "report_1": {"date": str(older["record_date"]), "title": older["title"]},
            "report_2": {"date": str(newer["record_date"]), "title": newer["title"]},
            "comparison": response.content,
            "generated_at": date.today().isoformat(),
        }
