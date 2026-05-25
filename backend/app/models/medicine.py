"""
HealthWeave – Medicine Intelligence Models
Full medicine history with interaction tracking.
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

from app.core.database import Base


class MedicineStatus(str, Enum):
    ACTIVE = "active"
    STOPPED = "stopped"
    COMPLETED = "completed"
    PAUSED = "paused"
    CHANGED = "changed"


class MedicineEntry(Base):
    """A prescription line item — one medicine in a prescription record."""
    __tablename__ = "medicine_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Raw name as extracted (may be brand name, handwritten, abbreviated)
    raw_name = Column(String(500), nullable=False)
    # Normalized canonical name after AI/drug-DB lookup
    canonical_name = Column(String(300), index=True)
    generic_name = Column(String(300))
    brand_name = Column(String(300))
    drug_class = Column(String(200))
    atc_code = Column(String(20))  # WHO ATC classification

    dosage = Column(String(100))       # e.g. "500mg"
    dosage_numeric = Column(Float)
    dosage_unit = Column(String(20))   # mg, ml, mcg
    frequency = Column(String(100))    # e.g. "twice daily"
    frequency_code = Column(String(20))  # SIG code: BID, TID, QD...
    route = Column(String(50))         # oral, topical, IV
    duration_days = Column(Integer)
    total_quantity = Column(Integer)

    prescribed_for = Column(Text)       # reason / indication
    prescribed_by = Column(String(300))
    prescribed_date = Column(Date, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    stopped_date = Column(Date)
    stopped_reason = Column(Text)

    status = Column(SAEnum(MedicineStatus), default=MedicineStatus.ACTIVE)
    is_recurring = Column(Boolean, default=False)
    adherence_score = Column(Float)   # 0.0 – 1.0

    side_effects_reported = Column(ARRAY(Text), default=list)
    ai_notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    record = relationship("HealthRecord", back_populates="medicine_entries")

    __table_args__ = (
        Index("ix_medicine_user_canonical", "user_id", "canonical_name"),
    )


class MedicineInteractionAlert(Base):
    """AI-detected potential drug interaction between two active medicines."""
    __tablename__ = "medicine_interaction_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_a_id = Column(UUID(as_uuid=True), ForeignKey("medicine_entries.id", ondelete="CASCADE"), nullable=False)
    medicine_b_id = Column(UUID(as_uuid=True), ForeignKey("medicine_entries.id", ondelete="CASCADE"), nullable=False)

    severity = Column(String(20))   # "minor" | "moderate" | "major" | "contraindicated"
    description = Column(Text)
    clinical_significance = Column(Text)
    recommendation = Column(Text)
    source = Column(String(100))    # "DrugBank" | "AI" | "FDA"

    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MedicineMasterCatalog(Base):
    """
    Local drug reference — Indian brand names, generics, common spellings.
    Seeded from OpenFDA + local Indian formularies.
    """
    __tablename__ = "medicine_master_catalog"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String(300), nullable=False, unique=True, index=True)
    generic_name = Column(String(300))
    brand_names = Column(ARRAY(Text), default=list)
    drug_class = Column(String(200))
    atc_code = Column(String(20))
    mechanism_of_action = Column(Text)
    common_indications = Column(ARRAY(Text), default=list)
    common_side_effects = Column(ARRAY(Text), default=list)
    contraindications = Column(ARRAY(Text), default=list)
    is_controlled = Column(Boolean, default=False)
    is_otc = Column(Boolean, default=False)
    is_indian_market = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
