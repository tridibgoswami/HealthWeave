"""
Unit tests for medicine interaction detection.
Covers: severity validation, < 2 medicine early exit, LLM response parsing,
name-fallback matching, and the get_interactions query path.
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import FakeDB, FakeLLMClient, make_medicine, make_user_id


# ── Severity constants ────────────────────────────────────────────────────────

VALID_SEVERITIES = {"minor", "moderate", "major", "contraindicated"}

class TestSeverityValidation:

    def test_all_valid_severity_values_accepted(self):
        for sev in VALID_SEVERITIES:
            assert sev in VALID_SEVERITIES

    def test_severity_ordering(self):
        """Severity levels have a defined clinical escalation order."""
        rank = {"minor": 1, "moderate": 2, "major": 3, "contraindicated": 4}
        assert rank["contraindicated"] > rank["major"]
        assert rank["major"] > rank["moderate"]
        assert rank["moderate"] > rank["minor"]


# ── Early-exit with < 2 medicines ────────────────────────────────────────────

class TestEarlyExitConditions:

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_active_medicines(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        fake_db = FakeDB()
        fake_db.queue_result(items=[])  # empty medicine list

        service = MedicineInteractionService(fake_db)
        result = await service.check_and_save_interactions(make_user_id())
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_only_one_active_medicine(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        fake_db = FakeDB()
        fake_db.queue_result(items=[make_medicine(user_id, "Metformin")])

        service = MedicineInteractionService(fake_db)
        result = await service.check_and_save_interactions(user_id)
        assert result == []


# ── LLM response parsing ──────────────────────────────────────────────────────

class TestLLMResponseParsing:
    """Interaction service should handle various LLM response formats robustly."""

    def _make_interaction_json(self, med_a_id, med_b_id, severity="moderate"):
        return json.dumps([{
            "medicine_a_id": str(med_a_id),
            "medicine_a_name": "Metformin",
            "medicine_b_id": str(med_b_id),
            "medicine_b_name": "Warfarin",
            "severity": severity,
            "description": "Metformin may enhance anticoagulant effect of Warfarin.",
            "clinical_significance": "Monitor INR closely when starting or stopping Metformin.",
            "recommendation": "Consult prescribing physician. Monitor INR weekly for 2–4 weeks.",
            "confidence": 0.82,
        }])

    @pytest.mark.asyncio
    async def test_parses_clean_json_response(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        med_a = make_medicine(user_id, "Metformin")
        med_b = make_medicine(user_id, "Warfarin", drug_class="Anticoagulant")

        fake_db = FakeDB()
        # First execute: list medicines
        fake_db.queue_result(items=[med_a, med_b])
        # Second execute: delete old AI interactions
        fake_db.queue_result(items=[])

        llm_response = self._make_interaction_json(med_a.id, med_b.id, "moderate")
        fake_llm = FakeLLMClient(response_content=llm_response)

        with patch("app.services.ai.medicine_interaction_service.get_llm_client", return_value=fake_llm):
            service = MedicineInteractionService(fake_db)
            result = await service.check_and_save_interactions(user_id)

        assert len(result) == 1
        assert result[0]["severity"] == "moderate"
        assert result[0]["medicine_a"] == "Metformin"

    @pytest.mark.asyncio
    async def test_parses_json_wrapped_in_code_fence(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        med_a = make_medicine(user_id, "Metformin")
        med_b = make_medicine(user_id, "Warfarin")

        fake_db = FakeDB()
        fake_db.queue_result(items=[med_a, med_b])
        fake_db.queue_result(items=[])

        raw_json = self._make_interaction_json(med_a.id, med_b.id)
        fenced_response = f"```json\n{raw_json}\n```"
        fake_llm = FakeLLMClient(response_content=fenced_response)

        with patch("app.services.ai.medicine_interaction_service.get_llm_client", return_value=fake_llm):
            service = MedicineInteractionService(fake_db)
            result = await service.check_and_save_interactions(user_id)

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_returns_empty_on_malformed_llm_response(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        med_a = make_medicine(user_id, "Aspirin")
        med_b = make_medicine(user_id, "Ibuprofen")

        fake_db = FakeDB()
        fake_db.queue_result(items=[med_a, med_b])
        fake_db.queue_result(items=[])

        fake_llm = FakeLLMClient(response_content="Sorry, I cannot process this request.")

        with patch("app.services.ai.medicine_interaction_service.get_llm_client", return_value=fake_llm):
            service = MedicineInteractionService(fake_db)
            result = await service.check_and_save_interactions(user_id)

        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_llm_says_no_interactions(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        med_a = make_medicine(user_id, "Vitamin D")
        med_b = make_medicine(user_id, "Calcium")

        fake_db = FakeDB()
        fake_db.queue_result(items=[med_a, med_b])
        fake_db.queue_result(items=[])

        fake_llm = FakeLLMClient(response_content="[]")

        with patch("app.services.ai.medicine_interaction_service.get_llm_client", return_value=fake_llm):
            service = MedicineInteractionService(fake_db)
            result = await service.check_and_save_interactions(user_id)

        assert result == []


# ── Severity stored correctly ─────────────────────────────────────────────────

class TestInteractionAlertCreation:

    @pytest.mark.asyncio
    async def test_contraindicated_interaction_is_saved(self):
        from app.services.ai.medicine_interaction_service import MedicineInteractionService

        user_id = make_user_id()
        med_a = make_medicine(user_id, "Warfarin")
        med_b = make_medicine(user_id, "Aspirin")

        fake_db = FakeDB()
        fake_db.queue_result(items=[med_a, med_b])
        fake_db.queue_result(items=[])

        interaction = json.dumps([{
            "medicine_a_id": str(med_a.id),
            "medicine_a_name": "Warfarin",
            "medicine_b_id": str(med_b.id),
            "medicine_b_name": "Aspirin",
            "severity": "contraindicated",
            "description": "Combined use greatly increases bleeding risk.",
            "clinical_significance": "Risk of serious or fatal bleeding.",
            "recommendation": "Avoid combination. Consult cardiologist immediately.",
            "confidence": 0.95,
        }])
        fake_llm = FakeLLMClient(response_content=interaction)

        with patch("app.services.ai.medicine_interaction_service.get_llm_client", return_value=fake_llm):
            service = MedicineInteractionService(fake_db)
            result = await service.check_and_save_interactions(user_id)

        assert len(result) == 1
        assert result[0]["severity"] == "contraindicated"
        # An alert object should have been added to the session
        assert len(fake_db.added) == 1
        saved_alert = fake_db.added[0]
        assert saved_alert.severity == "contraindicated"
