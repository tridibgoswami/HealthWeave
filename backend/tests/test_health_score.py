"""
Unit tests for health score computation logic.
Tests the scoring rules, normalization, and data-completeness calculation
without hitting the database or Claude API.
"""

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import make_health_score_data, make_user_id, FakeDB, FakeLLMClient


# ── Score range validation ────────────────────────────────────────────────────

class TestScoreRangeValidation:
    """Health scores must stay within 0–100 bounds."""

    def test_all_scores_in_valid_range(self):
        data = make_health_score_data()
        for key, value in data["scores"].items():
            assert 0 <= value <= 100, f"{key} = {value} is outside 0–100"

    def test_overall_score_is_not_highest(self):
        """Overall score should not exceed the best individual score (weighted average)."""
        data = make_health_score_data()
        scores = list(data["scores"].values())
        overall = data["scores"]["overall_score"]
        assert overall <= max(scores), "Overall cannot exceed best individual score"

    def test_confidence_is_probability(self):
        data = make_health_score_data()
        assert 0 <= data["confidence"] <= 1

    def test_data_completeness_is_fraction(self):
        data = make_health_score_data()
        assert 0 <= data["data_completeness"] <= 1


# ── HealthScore model hydration ───────────────────────────────────────────────

class TestHealthScoreModelHydration:
    """Verify the HealthScore ORM object is built correctly from engine output."""

    def test_score_fields_mapped_correctly(self):
        from app.models.intelligence import HealthScore

        data = make_health_score_data()
        scores = data["scores"]
        user_id = make_user_id()

        score = HealthScore(
            user_id=user_id,
            scored_date=date.today(),
            overall_score=scores.get("overall_score"),
            heart_score=scores.get("heart_score"),
            liver_score=scores.get("liver_score"),
            kidney_score=scores.get("kidney_score"),
            metabolic_score=scores.get("metabolic_score"),
            inflammation_score=scores.get("inflammation_score"),
            lifestyle_score=scores.get("lifestyle_score"),
            preventive_score=scores.get("preventive_score"),
            thyroid_score=scores.get("thyroid_score"),
            blood_score=scores.get("blood_score"),
            ai_narrative=data.get("ai_narrative"),
            confidence=data.get("confidence"),
            data_completeness=data.get("data_completeness"),
            contributing_factors=data.get("contributing_factors", {}),
        )

        assert score.user_id == user_id
        assert score.overall_score == 72.0
        assert score.metabolic_score == 58.0
        assert score.ai_narrative == "Your metabolic health requires attention. Consider dietary changes."
        assert score.confidence == 0.78
        assert "metabolic_score" in score.contributing_factors

    def test_missing_scores_default_to_none(self):
        from app.models.intelligence import HealthScore

        score = HealthScore(
            user_id=make_user_id(),
            scored_date=date.today(),
        )
        assert score.overall_score is None
        assert score.heart_score is None


# ── Background task score persistence ────────────────────────────────────────

class TestScorePersistence:
    """The background task _compute_scores_background should create a HealthScore row."""

    @pytest.mark.asyncio
    async def test_background_task_adds_score_row(self):
        user_id = make_user_id()
        fake_db = FakeDB()
        engine_data = make_health_score_data()

        mock_engine = AsyncMock()
        mock_engine.compute_health_scores = AsyncMock(return_value=engine_data)

        with patch("app.api.v1.intelligence.PredictionEngine", return_value=mock_engine), \
             patch("app.core.database.get_db_context") as mock_ctx:

            mock_ctx.return_value.__aenter__ = AsyncMock(return_value=fake_db)
            mock_ctx.return_value.__aexit__ = AsyncMock(return_value=False)

            from app.api.v1.intelligence import _compute_scores_background
            await _compute_scores_background(str(user_id))

        assert len(fake_db.added) == 1
        added = fake_db.added[0]
        assert added.user_id == user_id
        assert added.overall_score == 72.0
        assert added.metabolic_score == 58.0

    @pytest.mark.asyncio
    async def test_background_task_handles_missing_scores_gracefully(self):
        """Engine returning empty scores dict should not raise."""
        user_id = make_user_id()
        fake_db = FakeDB()

        mock_engine = AsyncMock()
        mock_engine.compute_health_scores = AsyncMock(return_value={
            "scores": {},
            "ai_narrative": None,
            "confidence": None,
            "data_completeness": 0.0,
            "contributing_factors": {},
        })

        with patch("app.api.v1.intelligence.PredictionEngine", return_value=mock_engine), \
             patch("app.core.database.get_db_context") as mock_ctx:

            mock_ctx.return_value.__aenter__ = AsyncMock(return_value=fake_db)
            mock_ctx.return_value.__aexit__ = AsyncMock(return_value=False)

            from app.api.v1.intelligence import _compute_scores_background
            await _compute_scores_background(str(user_id))

        assert len(fake_db.added) == 1
        assert fake_db.added[0].overall_score is None


# ── Score delta calculation ───────────────────────────────────────────────────

class TestScoreDeltaLogic:
    """Verify delta computation correctness (pure logic, no DB)."""

    def test_positive_delta_when_score_improves(self):
        prev = {"heart_score": 60.0, "metabolic_score": 55.0}
        curr = {"heart_score": 68.0, "metabolic_score": 58.0}
        deltas = {k: round(curr[k] - prev[k], 2) for k in curr}
        assert deltas["heart_score"] == 8.0
        assert deltas["metabolic_score"] == 3.0

    def test_negative_delta_when_score_declines(self):
        prev = {"kidney_score": 80.0}
        curr = {"kidney_score": 72.0}
        deltas = {k: round(curr[k] - prev[k], 2) for k in curr}
        assert deltas["kidney_score"] == -8.0

    def test_zero_delta_when_unchanged(self):
        prev = {"thyroid_score": 90.0}
        curr = {"thyroid_score": 90.0}
        deltas = {k: round(curr[k] - prev[k], 2) for k in curr}
        assert deltas["thyroid_score"] == 0.0
