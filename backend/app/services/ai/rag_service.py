"""
HealthWeave – RAG (Retrieval-Augmented Generation) Pipeline
Semantic search over the patient's full medical history to ground AI answers.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health_record import HealthRecord, BiomarkerValue
from app.models.medicine import MedicineEntry
from app.models.intelligence import ChatMessage
from app.services.ai.llm_client import LLMClient, get_llm_client

logger = logging.getLogger(__name__)

MAX_CONTEXT_RECORDS = 15
MAX_CONTEXT_TOKENS = 6000


class RAGService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_client()

    async def retrieve_relevant_context(
        self,
        user_id: UUID,
        query: str,
        limit: int = MAX_CONTEXT_RECORDS,
    ) -> list[dict]:
        """
        Two-stage retrieval:
        1. Vector similarity on content_embedding (semantic)
        2. Full-text search as fallback / supplement
        """
        query_embedding = await self.llm.embed(query)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # pgvector cosine similarity search
        vector_sql = text("""
            SELECT
                hr.id,
                hr.record_type,
                hr.title,
                hr.record_date,
                hr.ai_summary,
                hr.ai_extracted_biomarkers,
                hr.hospital_name,
                hr.doctor_name,
                1 - (hr.content_embedding <=> :embedding::vector) AS similarity
            FROM health_records hr
            WHERE hr.user_id = :user_id
              AND hr.content_embedding IS NOT NULL
              AND hr.is_archived = false
            ORDER BY hr.content_embedding <=> :embedding::vector
            LIMIT :limit
        """)

        result = await self.db.execute(
            vector_sql,
            {"user_id": str(user_id), "embedding": embedding_str, "limit": limit},
        )
        records = result.mappings().all()

        # Full-text search supplement for high-recall on specific terms
        fts_sql = text("""
            SELECT
                hr.id,
                hr.record_type,
                hr.title,
                hr.record_date,
                hr.ai_summary,
                hr.ai_extracted_biomarkers,
                hr.hospital_name,
                hr.doctor_name,
                ts_rank(hr.search_vector, plainto_tsquery('english', :query)) AS similarity
            FROM health_records hr
            WHERE hr.user_id = :user_id
              AND hr.search_vector @@ plainto_tsquery('english', :query)
              AND hr.is_archived = false
            ORDER BY similarity DESC
            LIMIT :limit
        """)

        fts_result = await self.db.execute(
            fts_sql,
            {"user_id": str(user_id), "query": query, "limit": limit // 2},
        )
        fts_records = fts_result.mappings().all()

        # Merge and deduplicate — prefer vector results
        seen_ids = {r["id"] for r in records}
        merged = list(records) + [r for r in fts_records if r["id"] not in seen_ids]
        return merged[:limit]

    async def build_context_prompt(
        self,
        user_id: UUID,
        query: str,
        include_biomarkers: bool = True,
        include_medicines: bool = True,
    ) -> str:
        """Assemble a structured context string to inject into the LLM prompt."""
        records = await self.retrieve_relevant_context(user_id, query)

        if include_biomarkers:
            biomarkers = await self._get_recent_biomarkers(user_id)
        else:
            biomarkers = []

        if include_medicines:
            medicines = await self._get_active_medicines(user_id)
        else:
            medicines = []

        context_parts = ["## Patient Health Context\n"]

        if records:
            context_parts.append("### Relevant Medical Records\n")
            for rec in records:
                context_parts.append(
                    f"**[{rec['record_date']}] {rec['title']}** ({rec['record_type']})\n"
                    f"Hospital: {rec['hospital_name'] or 'N/A'} | Doctor: {rec['doctor_name'] or 'N/A'}\n"
                    f"Summary: {rec['ai_summary'] or 'No summary'}\n"
                )
                if rec["ai_extracted_biomarkers"]:
                    context_parts.append(f"Key Values: {rec['ai_extracted_biomarkers']}\n")
                context_parts.append("\n")

        if biomarkers:
            context_parts.append("### Recent Biomarker Trends\n")
            for bm in biomarkers[:20]:
                context_parts.append(
                    f"- {bm['name']}: {bm['value_numeric']} {bm['unit']} "
                    f"[{bm['status']}] on {bm['measured_at']}\n"
                )

        if medicines:
            context_parts.append("\n### Current Medications\n")
            for med in medicines:
                context_parts.append(
                    f"- {med['canonical_name'] or med['raw_name']} "
                    f"{med['dosage']} {med['frequency']} "
                    f"(since {med['prescribed_date'] or 'unknown'})\n"
                )

        context_parts.append("\n### Patient Query\n")
        context_parts.append(query)

        return "".join(context_parts)

    async def _get_recent_biomarkers(self, user_id: UUID, limit: int = 30) -> list:
        sql = text("""
            SELECT DISTINCT ON (canonical_name)
                name, canonical_name, value_numeric, unit, status, measured_at
            FROM biomarker_values
            WHERE user_id = :user_id
            ORDER BY canonical_name, measured_at DESC
            LIMIT :limit
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id), "limit": limit})
        return result.mappings().all()

    async def _get_active_medicines(self, user_id: UUID) -> list:
        sql = text("""
            SELECT raw_name, canonical_name, dosage, frequency, prescribed_date, status
            FROM medicine_entries
            WHERE user_id = :user_id AND status = 'active'
            ORDER BY prescribed_date DESC
            LIMIT 20
        """)
        result = await self.db.execute(sql, {"user_id": str(user_id)})
        return result.mappings().all()

    async def answer_with_memory(
        self,
        user_id: UUID,
        query: str,
        conversation_history: list[dict] | None = None,
    ) -> tuple[str, list[dict]]:
        """Full RAG answer — returns (answer, source_records)."""
        context_prompt = await self.build_context_prompt(user_id, query)
        sources = await self.retrieve_relevant_context(user_id, query, limit=5)

        response = await self.llm.complete(
            prompt=context_prompt,
            context_messages=conversation_history or [],
            inject_disclaimer=True,
        )

        source_refs = [
            {
                "id": str(s["id"]),
                "title": s["title"],
                "date": str(s["record_date"]),
                "type": s["record_type"],
            }
            for s in sources
        ]

        return response.content, source_refs
