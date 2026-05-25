"""
HealthWeave – Family Health Graph Models
Hereditary disease tracking, family relationships, caregiver access.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    String, Text, JSON, Enum as SAEnum, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship as orm_relationship

from app.core.database import Base


class Relationship(str, Enum):
    SELF = "self"
    SPOUSE = "spouse"
    FATHER = "father"
    MOTHER = "mother"
    SON = "son"
    DAUGHTER = "daughter"
    BROTHER = "brother"
    SISTER = "sister"
    GRANDFATHER = "grandfather"
    GRANDMOTHER = "grandmother"
    UNCLE = "uncle"
    AUNT = "aunt"
    COUSIN = "cousin"
    CAREGIVER = "caregiver"
    OTHER = "other"


class AccessLevel(str, Enum):
    VIEW_SUMMARY = "view_summary"        # Can see health score, emergency profile
    VIEW_RECORDS = "view_records"         # Can see all records
    FULL_ACCESS = "full_access"           # Can upload, modify
    EMERGENCY_ONLY = "emergency_only"     # Emergency passport only


class FamilyMember(Base):
    """
    Links a user to another user (or a non-user profile) as a family member.
    Builds the family health graph.
    """
    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # If the family member is also a HealthWeave user
    linked_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # For non-users (offline family profile)
    member_name = Column(String(200))
    relationship = Column(SAEnum(Relationship), nullable=False)
    access_level = Column(SAEnum(AccessLevel), default=AccessLevel.VIEW_SUMMARY)

    known_conditions = Column(ARRAY(Text), default=list)   # hereditary conditions
    age_at_diagnosis = Column(JSON, default=dict)           # {"diabetes": 45, "hypertension": 52}
    is_deceased = Column(Boolean, default=False)
    notes = Column(Text)

    is_invitation_pending = Column(Boolean, default=False)
    invitation_token = Column(String(200))
    invitation_accepted_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = orm_relationship("User", foreign_keys="FamilyMember.user_id", back_populates="family_members")


class FamilyHereditaryRisk(Base):
    """
    AI-computed hereditary risk patterns for a user based on family graph.
    Regenerated when family data changes.
    """
    __tablename__ = "family_hereditary_risks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    condition = Column(String(200), nullable=False)   # e.g. "Type 2 Diabetes"
    icd10_code = Column(String(20))
    affected_relatives = Column(JSON, default=list)    # [{"relation": "father", "age_onset": 50}]
    risk_level = Column(String(20))                    # "low" | "moderate" | "high" | "very_high"
    risk_score = Column(JSON)                          # {"value": 0.72, "confidence": 0.8}
    ai_explanation = Column(Text)
    preventive_actions = Column(ARRAY(Text), default=list)
    screening_recommendations = Column(ARRAY(Text), default=list)

    computed_at = Column(DateTime(timezone=True), server_default=func.now())
    next_compute_at = Column(DateTime(timezone=True))
