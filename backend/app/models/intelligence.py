"""
HealthWeave – AI Intelligence & Scoring Models
Health scores, predictions, correlation findings, chat sessions.
"""

import uuid
from datetime import datetime, date
from enum import Enum

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.core.config import settings


class HealthScore(Base):
    """
    Continuously updated multi-dimensional health scoring.
    One row per date per user — time series of scores.
    """
    __tablename__ = "health_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scored_date = Column(Date, nullable=False, index=True)

    # Organ / system scores (0 – 100)
    overall_score = Column(Float)
    heart_score = Column(Float)
    liver_score = Column(Float)
    kidney_score = Column(Float)
    metabolic_score = Column(Float)
    inflammation_score = Column(Float)
    lifestyle_score = Column(Float)
    preventive_score = Column(Float)
    mental_wellness_score = Column(Float)
    thyroid_score = Column(Float)
    blood_score = Column(Float)

    score_deltas = Column(JSON, default=dict)      # {"heart_score": +2.1, "metabolic_score": -1.4}
    contributing_factors = Column(JSON, default=dict)
    ai_narrative = Column(Text)                     # Plain-language explanation of scores

    data_completeness = Column(Float)               # 0.0 – 1.0, how much data drove this score
    confidence = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="health_scores")

    __table_args__ = (
        Index("ix_health_scores_user_date", "user_id", "scored_date"),
    )


class PredictiveAlert(Base):
    """
    AI-generated health risk prediction or preventive alert.
    Strictly not a diagnosis — risk indicator only.
    """
    __tablename__ = "predictive_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    alert_type = Column(String(50), nullable=False)   # "risk_trend" | "preventive" | "screening_due" | "follow_up"
    category = Column(String(100))                     # "cardiovascular" | "metabolic" | "renal" | etc.
    title = Column(String(500), nullable=False)
    summary = Column(Text)
    detailed_explanation = Column(Text)

    risk_level = Column(String(20))          # "low" | "moderate" | "high" | "critical"
    risk_score = Column(Float)               # 0.0 – 1.0
    confidence = Column(Float)               # model confidence
    time_horizon = Column(String(50))        # "3 months" | "1 year" | "5 years"

    supporting_evidence = Column(JSON, default=list)  # biomarkers, trends that triggered this
    recommended_actions = Column(ARRAY(Text), default=list)
    consult_specialist = Column(String(200))  # "Cardiologist" | "Endocrinologist"

    medical_disclaimer = Column(Text)
    is_dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime(timezone=True))
    is_actioned = Column(Boolean, default=False)

    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_predictive_alerts_user_type", "user_id", "alert_type"),
    )


class CorrelationFinding(Base):
    """
    AI-discovered correlation across health data — the correlation engine output.
    e.g. "HbA1c trend ↑ correlates with cholesterol pattern"
    """
    __tablename__ = "correlation_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    finding_type = Column(String(100))     # "biomarker_correlation" | "symptom_pattern" | "medication_effect"
    title = Column(String(500), nullable=False)
    description = Column(Text)
    clinical_significance = Column(Text)

    entities_involved = Column(JSON, default=list)   # [{"type": "biomarker", "name": "HbA1c"}, ...]
    time_span_start = Column(Date)
    time_span_end = Column(Date)
    data_points_count = Column(Integer)

    correlation_coefficient = Column(Float)
    p_value = Column(Float)
    confidence = Column(Float)

    ai_explanation = Column(Text)
    preventive_suggestion = Column(Text)
    medical_disclaimer = Column(Text)

    is_reviewed = Column(Boolean, default=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(500))
    session_type = Column(String(50), default="general")  # "general" | "report_analysis" | "symptom_query"
    context_record_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)

    message_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    role = Column(String(20), nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list)         # health records referenced
    has_medical_disclaimer = Column(Boolean, default=False)

    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    latency_ms = Column(Integer)

    content_embedding = Column(Vector(settings.VECTOR_DIMENSION))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


class EmergencyPassport(Base):
    """
    Offline-accessible emergency health passport — QR-linked.
    Contains only critical life-safety information.
    """
    __tablename__ = "emergency_passports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Critical fields
    blood_group = Column(String(10))
    allergies = Column(ARRAY(Text), default=list)
    current_critical_medicines = Column(JSON, default=list)
    chronic_conditions = Column(ARRAY(Text), default=list)
    implants = Column(ARRAY(Text), default=list)
    recent_surgeries = Column(ARRAY(Text), default=list)
    do_not_resuscitate = Column(Boolean, default=False)

    emergency_contacts = Column(JSON, default=list)
    insurance_info = Column(JSON, default=dict)

    # QR code
    qr_token = Column(String(200), unique=True, index=True)
    qr_code_url = Column(String(1000))
    qr_generated_at = Column(DateTime(timezone=True))

    # Offline-ready snapshot (JSON payload embedded in QR)
    offline_snapshot = Column(JSON)
    snapshot_updated_at = Column(DateTime(timezone=True))

    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="emergency_passport")
