import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lecturer, AvailabilitySlot, Appointment, AppointmentStatus, Profile
from app.schemas import LecturerOut, SlotOut
from app.security import get_current_user

router = APIRouter()

# Active-booking statuses (slot is NOT free when appointment has one of these)
ACTIVE = (
    AppointmentStatus.pending,
    AppointmentStatus.approved,
    AppointmentStatus.cancellation_requested,
    AppointmentStatus.rescheduling_requested,
)


def _slot_is_booked(slot_id: uuid.UUID, db: Session) -> bool:
    return db.query(Appointment).filter(
        Appointment.slot_id == slot_id,
        Appointment.status.in_(ACTIVE),
    ).first() is not None


def _build_lecturer_out(lec: Lecturer, open_slots: list) -> LecturerOut:
    p: Profile = lec.profile
    return LecturerOut(
        id=lec.id,
        title=lec.title,
        full_name=p.full_name if p else "",
        email=p.email if p else "",
        department=lec.department,
        specialization=lec.specialization,
        office_location=lec.office_location,
        consultation_info=lec.consultation_info,
        open_slots=open_slots,
    )


def _to_slot_out(s: AvailabilitySlot, open: bool) -> SlotOut:
    return SlotOut(
        id=s.id,
        slot_date=s.slot_date,
        start_time=s.start_time,
        end_time=s.end_time,
        location_type=s.location_type,
        location=s.location,
        notes=s.notes,
        open=open,
    )


# ---------------------------------------------------------------------------
# GET /api/lecturers?search=&department=
# ---------------------------------------------------------------------------
@router.get("", response_model=list[LecturerOut])
def list_lecturers(
    search: Optional[str] = "",
    department: Optional[str] = "",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Lecturer)

    if search:
        pattern = f"%{search}%"
        query = query.join(Lecturer.profile).filter(
            or_(
                func.lower(Profile.full_name).like(func.lower(pattern)),
                func.lower(Lecturer.specialization).like(func.lower(pattern)),
            )
        )

    if department:
        query = query.filter(
            func.lower(Lecturer.department).like(func.lower(f"%{department}%"))
        )

    lecturers = query.all()
    today = date.today()

    result = []
    for lec in lecturers:
        future_slots = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.lecturer_id == lec.id,
            AvailabilitySlot.slot_date >= today,
        ).order_by(AvailabilitySlot.slot_date, AvailabilitySlot.start_time).all()

        open_slots = [
            _to_slot_out(s, True)
            for s in future_slots
            if not _slot_is_booked(s.id, db)
        ]
        result.append(_build_lecturer_out(lec, open_slots))

    return result


# ---------------------------------------------------------------------------
# GET /api/lecturers/{id}/slots
# ---------------------------------------------------------------------------
@router.get("/{lecturer_id}/slots", response_model=list[SlotOut])
def get_slots(
    lecturer_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    lec = db.get(Lecturer, lecturer_id)
    if not lec:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    slots = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.lecturer_id == lecturer_id,
        AvailabilitySlot.slot_date >= date.today(),
    ).order_by(AvailabilitySlot.slot_date, AvailabilitySlot.start_time).all()

    return [_to_slot_out(s, not _slot_is_booked(s.id, db)) for s in slots]
