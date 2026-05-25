"""
HealthWeave – User & Profile Models
"""

import uuid
from datetime import datetime, date
from enum import Enum
from typing import Optional, List

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum, func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT = "prefer_not_to_say"


class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "unknown"


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    CAREGIVER = "caregiver"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.PATIENT, nullable=False)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime(timezone=True))
    phone_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    health_records = relationship("HealthRecord", back_populates="user", cascade="all, delete-orphan")
    family_members = relationship("FamilyMember", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    emergency_passport = relationship("EmergencyPassport", back_populates="user", uselist=False, cascade="all, delete-orphan")
    health_scores = relationship("HealthScore", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(200))
    avatar_url = Column(String(500))

    date_of_birth = Column(Date)
    gender = Column(SAEnum(Gender))
    blood_group = Column(SAEnum(BloodGroup), default=BloodGroup.UNKNOWN)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    bmi = Column(Float)

    primary_language = Column(String(10), default="en")
    timezone = Column(String(50), default="Asia/Kolkata")
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")

    known_allergies = Column(ARRAY(Text), default=list)
    chronic_conditions = Column(ARRAY(Text), default=list)
    current_medications = Column(ARRAY(Text), default=list)
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relation = Column(String(50))

    insurance_provider = Column(String(200))
    insurance_policy_number = Column(String(100))
    insurance_valid_until = Column(Date)

    preferred_hospitals = Column(ARRAY(Text), default=list)
    primary_physician_name = Column(String(200))
    primary_physician_phone = Column(String(20))

    # AI-generated summary regenerated on data changes
    ai_health_summary = Column(Text)
    ai_summary_updated_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(200))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
