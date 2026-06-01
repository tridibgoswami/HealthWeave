"""HealthWeave – Vitals, Visits, and Comments Models"""

import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ManualVitalEntry(Base):
    """Patient-entered daily vitals like blood sugar, BP, weight."""
    __tablename__ = "manual_vital_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date = Column(Date, nullable=False)
    biomarker_name = Column(String(100), nullable=False)   # e.g. "blood_glucose", "blood_pressure_systolic"
    value_numeric = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)               # e.g. "mg/dL", "mmHg", "kg"
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    __table_args__ = (
        Index("ix_manual_vitals_user_biomarker", "user_id", "biomarker_name"),
        Index("ix_manual_vitals_user_date", "user_id", "entry_date"),
    )


class DocumentComment(Base):
    """Patient comments/notes on uploaded health records."""
    __tablename__ = "document_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    __table_args__ = (Index("ix_comments_record", "record_id"),)


class PatientVisit(Base):
    """A patient's visit to a doctor/hospital — groups related records."""
    __tablename__ = "patient_visits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_date = Column(Date, nullable=False)
    doctor_name = Column(String(200))
    hospital_name = Column(String(200))
    specialization = Column(String(100))
    chief_complaint = Column(Text)
    diagnosis = Column(Text)
    notes = Column(Text)
    follow_up_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    __table_args__ = (Index("ix_visits_user_date", "user_id", "visit_date"),)
