"""Shared pytest fixtures for HealthWeave backend tests."""

import uuid
from datetime import date, datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport


# ── Fake LLM client ──────────────────────────────────────────────────────────

class FakeLLMResponse:
    def __init__(self, content: str):
        self.content = content


class FakeLLMClient:
    """Synchronous-safe mock that avoids real API calls in tests."""

    def __init__(self, response_content: str = "[]"):
        self._response_content = response_content

    async def complete(self, prompt: str, system: str = "", **kwargs) -> FakeLLMResponse:
        return FakeLLMResponse(self._response_content)

    def set_response(self, content: str) -> None:
        self._response_content = content


@pytest.fixture
def fake_llm() -> FakeLLMClient:
    return FakeLLMClient()


# ── Async DB session mock ─────────────────────────────────────────────────────

class FakeScalarsResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items

    def first(self):
        return self._items[0] if self._items else None

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None


class FakeExecuteResult:
    def __init__(self, items=None, scalar=None):
        self._items = items or []
        self._scalar = scalar

    def scalars(self):
        return FakeScalarsResult(self._items)

    def scalar_one_or_none(self):
        return self._scalar

    def all(self):
        return self._items

    def mappings(self):
        return self

    def first(self):
        return self._items[0] if self._items else None


class FakeDB:
    """Minimal async DB session mock."""

    def __init__(self):
        self.added = []
        self._execute_results = []
        self._execute_index = 0

    def queue_result(self, items=None, scalar=None):
        self._execute_results.append(FakeExecuteResult(items=items or [], scalar=scalar))

    async def execute(self, *args, **kwargs):
        if self._execute_results and self._execute_index < len(self._execute_results):
            result = self._execute_results[self._execute_index]
            self._execute_index += 1
            return result
        return FakeExecuteResult()

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def close(self):
        pass

    async def delete(self, obj):
        pass


@pytest.fixture
def fake_db() -> FakeDB:
    return FakeDB()


# ── Sample data factories ─────────────────────────────────────────────────────

def make_user_id() -> uuid.UUID:
    return uuid.uuid4()


def make_medicine(
    user_id: uuid.UUID,
    name: str = "Metformin",
    drug_class: str = "Biguanide",
    status: str = "active",
) -> MagicMock:
    m = MagicMock()
    m.id = uuid.uuid4()
    m.user_id = user_id
    m.canonical_name = name
    m.raw_name = name
    m.generic_name = name.lower()
    m.drug_class = drug_class
    m.dosage = "500mg"
    m.dosage_unit = "mg"
    m.prescribed_for = "Type 2 diabetes"
    m.status = status
    return m


def make_passport(user_id: uuid.UUID) -> MagicMock:
    p = MagicMock()
    p.id = uuid.uuid4()
    p.user_id = user_id
    p.qr_token = "test-qr-token-abc123"
    p.blood_group = "O+"
    p.allergies = ["Penicillin", "Sulfa drugs"]
    p.current_critical_medicines = [{"name": "Metformin 500mg"}]
    p.chronic_conditions = ["Type 2 Diabetes"]
    p.implants = []
    p.recent_surgeries = []
    p.do_not_resuscitate = False
    p.emergency_contacts = [{"name": "Jane Doe", "phone": "+91 98765 43210", "relation": "Spouse"}]
    p.insurance_info = {}
    p.snapshot_updated_at = datetime.now(timezone.utc)
    p.is_active = True
    return p


def make_health_score_data() -> dict:
    """Simulated compute_health_scores() output from PredictionEngine."""
    return {
        "scores": {
            "overall_score": 72.0,
            "heart_score": 68.0,
            "liver_score": 81.0,
            "kidney_score": 75.0,
            "metabolic_score": 58.0,
            "inflammation_score": 65.0,
            "lifestyle_score": 70.0,
            "preventive_score": 80.0,
            "thyroid_score": 90.0,
            "blood_score": 77.0,
        },
        "ai_narrative": "Your metabolic health requires attention. Consider dietary changes.",
        "confidence": 0.78,
        "data_completeness": 0.65,
        "contributing_factors": {"metabolic_score": ["high HbA1c", "elevated fasting glucose"]},
    }
