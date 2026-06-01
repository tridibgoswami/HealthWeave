"""
HealthWeave – Health Records, Timeline, and Document Models
Core longitudinal data schema.
"""

import uuid
from datetime import datetime, date
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, TSVECTOR
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.core.config import settings


class RecordType(str, Enum):
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    SCAN = "scan"
    DISCHARGE_SUMMARY = "discharge_summary"
    VACCINATION = "vaccination"
    DOCTOR_VISIT = "doctor_visit"
    SURGERY = "surgery"
    SYMPTOM_LOG = "symptom_log"
    VITAL_READING = "vital_reading"
    HEALTH_PACKAGE = "health_package"
    INSURANCE_DOCUMENT = "insurance_document"
    OTHER = "other"


class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    ARCHIVED = "archived"


class HealthRecord(Base):
    """
    Core unit — one medical event/document in the patient's lifelong record.
    Everything else hangs off this.
    """
    __tablename__ = "health_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    record_type = Column(SAEnum(RecordType), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    record_date = Column(Date, nullable=False, index=True)
    hospital_name = Column(String(300))
    doctor_name = Column(String(300))
    doctor_specialization = Column(String(200))

    # FHIR-aligned identifiers
    fhir_resource_type = Column(String(50))
    fhir_resource_id = Column(String(200))
    icd10_codes = Column(ARRAY(Text), default=list)
    snomed_codes = Column(ARRAY(Text), default=list)
    loinc_codes = Column(ARRAY(Text), default=list)

    # Extracted structured data (from OCR + AI parsing)
    structured_data = Column(JSON, default=dict)

    # AI-generated fields
    ai_summary = Column(Text)
    ai_tags = Column(ARRAY(Text), default=list)
    ai_risk_flags = Column(ARRAY(Text), default=list)
    ai_extracted_biomarkers = Column(JSON, default=dict)  # {"HbA1c": {"value": 7.2, "unit": "%", "reference": "<5.7"}}

    # Visit grouping and biomarker comparison
    visit_id = Column(UUID(as_uuid=True), ForeignKey("patient_visits.id", ondelete="SET NULL"), nullable=True)
    biomarker_changes = Column(JSON, default=dict)  # auto-comparison with previous readings

    # Vector embedding for semantic search (pgvector)
    content_embedding = Column(Vector(settings.VECTOR_DIMENSION))

    # Full-text search
    search_vector = Column(TSVECTOR)

    is_archived = Column(Boolean, default=False)
    is_shared_with_family = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="health_records")
    documents = relationship("HealthDocument", back_populates="record", cascade="all, delete-orphan")
    biomarker_values = relationship("BiomarkerValue", back_populates="record", cascade="all, delete-orphan")
    medicine_entries = relationship("MedicineEntry", back_populates="record", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="record", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_health_records_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_health_records_user_date", "user_id", "record_date"),
    )


class HealthDocument(Base):
    """Raw file attached to a HealthRecord."""
    __tablename__ = "health_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    file_name = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer)
    mime_type = Column(String(100))
    storage_key = Column(String(1000), nullable=False)  # S3 object key
    storage_url = Column(String(2000))                  # presigned URL (ephemeral)
    checksum_sha256 = Column(String(64))
    encryption_key_id = Column(String(100))

    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.UPLOADING)
    ocr_raw_text = Column(Text)
    ocr_confidence = Column(Float)
    ocr_language = Column(String(10))
    ocr_processed_at = Column(DateTime(timezone=True))

    page_count = Column(Integer)
    thumbnail_key = Column(String(1000))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    record = relationship("HealthRecord", back_populates="documents")


class BiomarkerValue(Base):
    """
    Structured single biomarker reading extracted from a report.
    Enables longitudinal trend queries like: SELECT * WHERE name = 'HbA1c' ORDER BY date
    """
    __tablename__ = "biomarker_values"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False, index=True)  # e.g. "HbA1c"
    canonical_name = Column(String(200), index=True)         # LOINC normalized
    loinc_code = Column(String(20))
    value_numeric = Column(Float)
    value_text = Column(String(200))
    unit = Column(String(50))
    reference_range_low = Column(Float)
    reference_range_high = Column(Float)
    reference_range_text = Column(String(100))
    status = Column(String(20))  # "normal" | "high" | "low" | "critical"
    interpretation = Column(Text)

    measured_at = Column(Date, nullable=False, index=True)
    source_lab = Column(String(300))

    record = relationship("HealthRecord", back_populates="biomarker_values")

    __table_args__ = (
        Index("ix_biomarker_user_name_date", "user_id", "canonical_name", "measured_at"),
    )


class TimelineEvent(Base):
    """
    Denormalized timeline projection — drives the lifelong health timeline UI.
    Auto-generated from HealthRecord inserts.
    """
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False)

    event_date = Column(Date, nullable=False, index=True)
    year = Column(Integer, index=True)
    month = Column(Integer)

    event_type = Column(String(50), nullable=False)
    event_title = Column(String(500), nullable=False)
    event_summary = Column(Text)
    event_icon = Column(String(50))   # icon key for frontend
    severity = Column(String(20))    # "info" | "warning" | "critical" | "improvement"
    tags = Column(ARRAY(Text), default=list)
    ai_insight = Column(Text)        # AI-generated contextual insight for this event

    is_milestone = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    record = relationship("HealthRecord", back_populates="timeline_events")

    __table_args__ = (
        Index("ix_timeline_user_date", "user_id", "event_date"),
    )
