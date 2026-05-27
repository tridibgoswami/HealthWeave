"""
HealthWeave – Organization, Doctor, Consent, and Notification Models
Enterprise multi-tenant architecture for hospitals, clinics, and doctors.
"""

import uuid
from datetime import datetime, date
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class OrganizationType(str, Enum):
    HOSPITAL = "hospital"
    CLINIC = "clinic"
    DIAGNOSTIC_CENTER = "diagnostic_center"
    PHARMACY = "pharmacy"
    OTHER = "other"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class ConsentStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class NotificationType(str, Enum):
    REPORT_READY = "report_ready"
    DOCTOR_ACCESS_REQUEST = "doctor_access_request"
    CONSENT_GRANTED = "consent_granted"
    CONSENT_REVOKED = "consent_revoked"
    ALERT_GENERATED = "alert_generated"
    APPOINTMENT_REMINDER = "appointment_reminder"
    INVITATION = "invitation"
    SYSTEM = "system"


class Organization(Base):
    """Hospital, clinic, or diagnostic center registered on HealthWeave."""
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(300), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    org_type = Column(SAEnum(OrganizationType), default=OrganizationType.HOSPITAL)

    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(500))
    logo_url = Column(String(500))

    registration_number = Column(String(100))  # NABH / MCI number
    gstin = Column(String(20))

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # verified by HealthWeave admin

    settings = Column(JSON, default=dict)  # org-level feature flags
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # admin who created this org
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(Base):
    """Links a User (doctor/admin) to an Organization."""
    __tablename__ = "organization_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    role = Column(String(50), nullable=False, default="doctor")  # "doctor" | "hospital_admin" | "staff"
    department = Column(String(200))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    organization = relationship("Organization", back_populates="members")

    __table_args__ = (
        Index("ix_org_member_unique", "organization_id", "user_id", unique=True),
    )


class DoctorProfile(Base):
    """Extended professional profile for doctor users."""
    __tablename__ = "doctor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    medical_registration_number = Column(String(100))  # MCI/state council number
    specialization = Column(String(200))
    sub_specialization = Column(String(200))
    qualifications = Column(ARRAY(String), default=list)  # ["MBBS", "MD Cardiology"]
    experience_years = Column(Integer)
    consultation_fee = Column(Float)

    available_days = Column(ARRAY(String), default=list)   # ["Mon", "Wed", "Fri"]
    available_hours = Column(String(100))                  # "9:00 AM – 5:00 PM"

    bio = Column(Text)
    languages_spoken = Column(ARRAY(String), default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PatientConsent(Base):
    """
    Patient explicitly grants a doctor (or org) access to their health records.
    DPDP 2023 compliant — all access must be consent-based.
    """
    __tablename__ = "patient_consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)

    status = Column(SAEnum(ConsentStatus), default=ConsentStatus.ACTIVE)

    # What data is shared
    share_full_history = Column(Boolean, default=False)
    share_biomarkers = Column(Boolean, default=True)
    share_prescriptions = Column(Boolean, default=True)
    share_lab_reports = Column(Boolean, default=True)
    share_scans = Column(Boolean, default=False)
    share_mental_health = Column(Boolean, default=False)

    # Duration
    valid_from = Column(Date, default=date.today)
    valid_until = Column(Date, nullable=True)  # None = indefinite

    purpose = Column(Text)  # Why they're sharing (e.g. "Pre-surgery consultation")
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_consent_patient_doctor", "patient_id", "doctor_id"),
    )


class ClinicalNote(Base):
    """Doctor writes clinical notes about a patient consultation."""
    __tablename__ = "clinical_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    visit_date = Column(Date, nullable=False, default=date.today)
    chief_complaint = Column(Text)
    clinical_findings = Column(Text)
    diagnosis = Column(Text)
    icd10_codes = Column(ARRAY(String), default=list)
    treatment_plan = Column(Text)
    medications_prescribed = Column(JSON, default=list)  # [{name, dosage, duration}]
    follow_up_date = Column(Date, nullable=True)
    follow_up_notes = Column(Text)

    is_private = Column(Boolean, default=False)  # private from patient view
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LabRequest(Base):
    """Doctor requests lab tests for a patient."""
    __tablename__ = "lab_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    tests_requested = Column(ARRAY(String), default=list)  # ["CBC", "LFT", "HbA1c"]
    urgency = Column(String(20), default="routine")        # "routine" | "urgent" | "stat"
    clinical_notes = Column(Text)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    fulfilled_at = Column(DateTime(timezone=True), nullable=True)
    linked_record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="SET NULL"), nullable=True)


class Invitation(Base):
    """Hospital admin invites a doctor to join the organization."""
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    email = Column(String(255), nullable=False)
    role = Column(String(50), default="doctor")
    token = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(SAEnum(InvitationStatus), default=InvitationStatus.PENDING)

    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="invitations")


class Notification(Base):
    """In-app notifications for all user types."""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String(300), nullable=False)
    body = Column(Text)
    action_url = Column(String(500))  # deep link in app
    extra_data = Column(JSON, default=dict)

    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_notification_user_read", "user_id", "is_read"),
    )
