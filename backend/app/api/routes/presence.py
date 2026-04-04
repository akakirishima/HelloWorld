from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.deps import ActiveUser, AdminUser, DbSession
from app.models.session import Session
from app.models.user import User
from app.schemas.attendance import ChangeStatusRequest
from app.schemas.presence import PresenceItem, PresenceListResponse, PresenceMeResponse
from app.services.attendance_service import (
    change_status,
    normalize_datetime,
    resolve_target_user,
)

router = APIRouter(prefix="/presence")


@router.get("", response_model=PresenceListResponse)
def list_presence(_: AdminUser, db: DbSession) -> PresenceListResponse:
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.display_name.asc()).all()
    items = [serialize_presence_item(db, user) for user in users]
    return PresenceListResponse(items=items)


@router.get("/me", response_model=PresenceMeResponse)
def my_presence(user: ActiveUser, db: DbSession) -> PresenceMeResponse:
    return PresenceMeResponse.model_validate(serialize_presence_item(db, user))


@router.post("/status", response_model=PresenceItem)
def update_status(payload: ChangeStatusRequest, actor: ActiveUser, db: DbSession) -> PresenceItem:
    target = resolve_target_user(db, actor, payload.target_user_id)
    presence = change_status(db, actor=actor, target=target, to_status=payload.to_status)
    return serialize_presence_item(db, target, presence=presence)


def serialize_presence_item(
    db: DbSession,
    user: User,
    *,
    presence=None,
) -> PresenceItem:
    current = presence or user.presence
    if current is None:
        return PresenceItem(
            user_id=user.user_id,
            display_name=user.display_name,
            academic_year=user.academic_year,
            room_id=user.room_id,
            room_name=user.room.name if user.room else None,
            current_status="Off Campus",
            current_session_id=None,
            last_changed_at=None,
            today_check_in_at=None,
        )

    open_session = None
    if current.current_session_id is not None:
        open_session = db.get(Session, current.current_session_id)

    today_check_in_at = None
    if open_session is not None and open_session.check_in_at.date() == datetime.now(timezone.utc).date():
        today_check_in_at = open_session.check_in_at

    return PresenceItem(
        user_id=user.user_id,
        display_name=user.display_name,
        academic_year=user.academic_year,
        room_id=user.room_id,
        room_name=user.room.name if user.room else None,
        current_status=current.current_status,
        current_session_id=current.current_session_id,
        last_changed_at=normalize_optional_datetime(current.last_changed_at),
        today_check_in_at=normalize_optional_datetime(today_check_in_at),
    )


def normalize_optional_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return normalize_datetime(value)
