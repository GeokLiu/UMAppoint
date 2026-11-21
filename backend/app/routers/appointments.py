import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Appointment, AppointmentStatus, AvailabilitySlot, Profile
)
from app.schemas import BookingRequest, AppointmentOut, StatusUpdateRequest
from app.security import get_current_user, require_student, require_lecturer

router = APIRouter()

ACTIVE = (
    AppointmentStatus.pending,
    AppointmentStatus.approved,
    AppointmentStatus.cancellation_requested,
    AppointmentStatus.rescheduling_requested,
)


def _to_out(a: Appointment) -> AppointmentOut:
    lec_name = None
    lec_title = None
    lec_dept = None
    if getattr(a, "lecturer", None):
        lec_title = a.lecturer.title
        lec_dept = a.lecturer.department
        if getattr(a.lecturer, "profile", None):
            lec_name = a.lecturer.profile.full_name

    stud_name = None
    stud_matric = None
    if getattr(a, "student", None):
        stud_matric = a.student.matric_no
        if getattr(a.student, "profile", None):
            stud_name = a.student.profile.full_name

    return AppointmentOut(
        id=a.id,
        ref_code=a.ref_code,
        student_id=a.student_id,
        lecturer_id=a.lecturer_id,
        lecturer_name=lec_name,
        lecturer_title=lec_title,
        lecturer_department=lec_dept,
        student_name=stud_name,
        student_matric_no=stud_matric,
        slot_id=a.slot_id,
        appointment_date=a.appointment_date,
        start_time=a.start_time,
        end_time=a.end_time,
        location=a.location,
        purpose=a.purpose,
        status=a.status.value if hasattr(a.status, "value") else str(a.status),
        lecturer_note=a.lecturer_note,
        student_request_reason=a.student_request_reason,
        created_at=str(a.created_at) if a.created_at else None,
        updated_at=str(a.updated_at) if a.updated_at else None,
    )


# ===========================================================================
# Step 3: POST /api/appointments  (STUDENT only)
# Double-booking prevented via SELECT … FOR UPDATE (pessimistic lock)
# ===========================================================================
@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def book_appointment(
    req: BookingRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_student),
):
    try:
        # 1. Lock the slot row  → SELECT … FOR UPDATE
        slot: AvailabilitySlot = (
            db.query(AvailabilitySlot)
            .filter(AvailabilitySlot.id == req.slot_id)
            .with_for_update()          # <-- pessimistic lock
            .first()
        )
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found")

        # 2. Check availability (while holding lock)
        already_booked = db.query(Appointment).filter(
            Appointment.slot_id == slot.id,
            Appointment.status.in_(ACTIVE),
        ).first()
        if already_booked:
            raise HTTPException(status_code=400, detail="Slot already taken")

        # 3. Guard: cannot book own slot
        if slot.lecturer_id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot book your own slot")

        # 4. Guard: past slot
        if slot.slot_date < date.today():
            raise HTTPException(status_code=400, detail="This slot is in the past")

        # 5. Insert appointment with status PENDING
        now = datetime.utcnow().isoformat()
        location = (
            f"Online: {slot.location}" if slot.location_type == "online" else slot.location
        )
        appt_id = uuid.uuid4()
        ref_code = f"APT-{uuid.uuid4().hex[:6].upper()}"
        appt = Appointment(
            id=appt_id,
            ref_code=ref_code,
            student_id=current_user.id,
            lecturer_id=slot.lecturer_id,
            slot_id=slot.id,
            appointment_date=slot.slot_date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            location=location,
            purpose=req.purpose,
            status=AppointmentStatus.pending,
            created_at=now,
            updated_at=now,
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return _to_out(appt)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Booking failed: {str(e)}") from e


# ===========================================================================
# GET /api/appointments  (student's own list)
# ===========================================================================
@router.get("/appointments", response_model=list[AppointmentOut])
def my_appointments(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_student),
):
    appts = (
        db.query(Appointment)
        .filter(Appointment.student_id == current_user.id)
        .order_by(Appointment.appointment_date.desc())
        .all()
    )
    return [_to_out(a) for a in appts]


# ===========================================================================
# Step 4: GET /api/lecturer/appointments?status=PENDING  (LECTURER only)
# ===========================================================================
@router.get("/lecturer/appointments", response_model=list[AppointmentOut])
def lecturer_appointments(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_lecturer),
):
    query = db.query(Appointment).filter(Appointment.lecturer_id == current_user.id)

    if status:
        try:
            s = AppointmentStatus(status.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown status: {status}")
        query = query.filter(Appointment.status == s)

    appts = query.order_by(Appointment.appointment_date.asc()).all()
    return [_to_out(a) for a in appts]


# ===========================================================================
# Step 4: PATCH /api/appointments/{id}/status
# Supported:
# - Lecturer: APPROVED, REJECTED (when pending), COMPLETED (when approved), CANCELLED
# - Student:  CANCELLED (when pending or approved)
# ===========================================================================
@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentOut)
def update_appointment_status(
    appointment_id: uuid.UUID,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    try:
        # Lock the row
        appt: Appointment = (
            db.query(Appointment)
            .filter(Appointment.id == appointment_id)
            .with_for_update()
            .first()
        )
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")

        is_lecturer = (appt.lecturer_id == current_user.id)
        is_student = (appt.student_id == current_user.id)
        if not (is_lecturer or is_student):
            raise HTTPException(status_code=403, detail="Not authorized for this appointment")

        target = req.status.lower()

        if is_student:
            if target != "cancelled":
                raise HTTPException(status_code=400, detail="Students can only cancel their appointments")
            if appt.status not in (AppointmentStatus.pending, AppointmentStatus.approved):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot cancel an appointment that is already {appt.status.value}",
                )
            appt.status = AppointmentStatus.cancelled
            if req.reason:
                appt.student_request_reason = req.reason.strip()

        elif is_lecturer:
            if target in ("approved", "rejected"):
                if appt.status != AppointmentStatus.pending:
                    raise HTTPException(
                        status_code=400,
                        detail="Only pending appointments can be approved or rejected",
                    )
                appt.status = AppointmentStatus(target)
                if req.lecturer_note:
                    appt.lecturer_note = req.lecturer_note.strip()
            elif target == "completed":
                if appt.status != AppointmentStatus.approved:
                    raise HTTPException(
                        status_code=400,
                        detail="Only approved appointments can be marked completed",
                    )
                appt.status = AppointmentStatus.completed
            elif target == "cancelled":
                appt.status = AppointmentStatus.cancelled
                if req.lecturer_note:
                    appt.lecturer_note = req.lecturer_note.strip()

        appt.updated_at = datetime.utcnow().isoformat()

        db.commit()
        db.refresh(appt)
        return _to_out(appt)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update appointment: {str(e)}") from e
