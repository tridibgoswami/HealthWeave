"""
HealthWeave – Emergency Passport API
QR-based emergency medical access — works without login.
"""

import uuid
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_emergency_token, get_current_user_id
from app.models.intelligence import EmergencyPassport
from app.models.user import UserProfile

router = APIRouter(prefix="/emergency", tags=["Emergency Passport"])


@router.get("/passport/{qr_token}", include_in_schema=True)
async def get_emergency_passport_by_qr(
    qr_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Returns only critical emergency information.
    Accessible via QR code in emergencies.
    """
    result = await db.execute(
        select(EmergencyPassport).where(
            EmergencyPassport.qr_token == qr_token,
            EmergencyPassport.is_active == True,
        )
    )
    passport = result.scalar_one_or_none()
    if not passport:
        raise HTTPException(status_code=404, detail="Emergency passport not found or expired")

    # Return minimal critical data only
    return {
        "blood_group": passport.blood_group,
        "allergies": passport.allergies,
        "critical_medicines": passport.current_critical_medicines,
        "chronic_conditions": passport.chronic_conditions,
        "implants": passport.implants,
        "recent_surgeries": passport.recent_surgeries,
        "do_not_resuscitate": passport.do_not_resuscitate,
        "emergency_contacts": passport.emergency_contacts,
        "insurance": passport.insurance_info,
        "last_updated": str(passport.snapshot_updated_at) if passport.snapshot_updated_at else None,
        "disclaimer": "This information is provided for emergency use only.",
    }


@router.get("/my-passport")
async def get_my_passport(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyPassport).where(EmergencyPassport.user_id == uuid.UUID(user_id))
    )
    passport = result.scalar_one_or_none()
    if not passport:
        raise HTTPException(status_code=404, detail="No emergency passport configured")

    return {
        "id": str(passport.id),
        "blood_group": passport.blood_group,
        "allergies": passport.allergies,
        "critical_medicines": passport.current_critical_medicines,
        "chronic_conditions": passport.chronic_conditions,
        "implants": passport.implants,
        "recent_surgeries": passport.recent_surgeries,
        "do_not_resuscitate": passport.do_not_resuscitate,
        "emergency_contacts": passport.emergency_contacts,
        "insurance": passport.insurance_info,
        "qr_token": passport.qr_token,
        "qr_code_url": passport.qr_code_url,
        "is_active": passport.is_active,
        "updated_at": str(passport.updated_at) if passport.updated_at else None,
    }


@router.post("/my-passport", status_code=status.HTTP_201_CREATED)
async def create_or_update_passport(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyPassport).where(EmergencyPassport.user_id == uuid.UUID(user_id))
    )
    passport = result.scalar_one_or_none()

    qr_token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)

    if passport:
        await db.execute(
            update(EmergencyPassport)
            .where(EmergencyPassport.user_id == uuid.UUID(user_id))
            .values(
                blood_group=payload.get("blood_group", passport.blood_group),
                allergies=payload.get("allergies", passport.allergies),
                current_critical_medicines=payload.get("critical_medicines", passport.current_critical_medicines),
                chronic_conditions=payload.get("chronic_conditions", passport.chronic_conditions),
                implants=payload.get("implants", passport.implants),
                recent_surgeries=payload.get("recent_surgeries", passport.recent_surgeries),
                do_not_resuscitate=payload.get("do_not_resuscitate", passport.do_not_resuscitate),
                emergency_contacts=payload.get("emergency_contacts", passport.emergency_contacts),
                insurance_info=payload.get("insurance", passport.insurance_info),
                snapshot_updated_at=now,
            )
        )
        await db.commit()
        return {"message": "Emergency passport updated", "qr_token": passport.qr_token}
    else:
        new_passport = EmergencyPassport(
            user_id=uuid.UUID(user_id),
            blood_group=payload.get("blood_group"),
            allergies=payload.get("allergies", []),
            current_critical_medicines=payload.get("critical_medicines", []),
            chronic_conditions=payload.get("chronic_conditions", []),
            implants=payload.get("implants", []),
            recent_surgeries=payload.get("recent_surgeries", []),
            do_not_resuscitate=payload.get("do_not_resuscitate", False),
            emergency_contacts=payload.get("emergency_contacts", []),
            insurance_info=payload.get("insurance", {}),
            qr_token=qr_token,
            qr_generated_at=now,
            snapshot_updated_at=now,
            is_active=True,
        )
        db.add(new_passport)
        await db.commit()
        return {"message": "Emergency passport created", "qr_token": qr_token}


@router.post("/my-passport/auto-update")
async def auto_update_passport_from_records(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Pull latest critical information from health records
    and update the emergency passport automatically.
    """
    from sqlalchemy import text

    # Get active medicines
    meds_sql = text("""
        SELECT raw_name, canonical_name, dosage, frequency
        FROM medicine_entries
        WHERE user_id = :user_id AND status = 'active'
        ORDER BY prescribed_date DESC
        LIMIT 10
    """)
    meds_result = await db.execute(meds_sql, {"user_id": user_id})
    critical_meds = [
        f"{m['canonical_name'] or m['raw_name']} {m['dosage'] or ''} {m['frequency'] or ''}".strip()
        for m in meds_result.mappings().all()
    ]

    # Get profile
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == uuid.UUID(user_id))
    )
    profile = profile_result.scalar_one_or_none()

    if profile:
        updates = {
            "blood_group": profile.blood_group,
            "allergies": profile.known_allergies or [],
            "chronic_conditions": profile.chronic_conditions or [],
            "current_critical_medicines": [{"name": m} for m in critical_meds],
            "emergency_contacts": [
                {
                    "name": profile.emergency_contact_name,
                    "phone": profile.emergency_contact_phone,
                    "relation": profile.emergency_contact_relation,
                }
            ] if profile.emergency_contact_name else [],
        }

        result = await db.execute(
            select(EmergencyPassport).where(EmergencyPassport.user_id == uuid.UUID(user_id))
        )
        passport = result.scalar_one_or_none()

        if passport:
            await db.execute(
                update(EmergencyPassport)
                .where(EmergencyPassport.user_id == uuid.UUID(user_id))
                .values(**updates, snapshot_updated_at=datetime.now(timezone.utc))
            )
        else:
            qr_token = secrets.token_urlsafe(24)
            new_passport = EmergencyPassport(
                user_id=uuid.UUID(user_id),
                qr_token=qr_token,
                qr_generated_at=datetime.now(timezone.utc),
                snapshot_updated_at=datetime.now(timezone.utc),
                **updates,
            )
            db.add(new_passport)

        await db.commit()

    return {"status": "updated", "medicines_synced": len(critical_meds)}
