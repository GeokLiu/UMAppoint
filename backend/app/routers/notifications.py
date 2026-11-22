import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notification, Profile
from app.schemas import NotificationOut
from app.security import get_current_user

router = APIRouter()


@router.get("", response_model=List[NotificationOut])
@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Return all notifications for the authenticated user, newest first."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifs


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Mark all notifications for the current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read"}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
