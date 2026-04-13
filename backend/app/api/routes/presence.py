from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.deps import ActiveUser, AdminUser, AppStores
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.models.user import UserRecord
from app.schemas.attendance import ChangeStatusRequest
from app.schemas.presence import PresenceItem, PresenceListResponse, PresenceMeResponse
from app.services.attendance_service import (
    change_status,
    normalize_datetime,
    resolve_target_user,
)

router = APIRouter(prefix="/presence")


@router.get("", response_model=PresenceListResponse)
def list_presence(_: AdminUser, stores: AppStores) -> PresenceListResponse:
    users = sorted(
        [u for u in stores.users.list_all() if u.is_active],
        key=lambda u: u.display_name,
    )
    presences = {p.user_id: p for p in stores.presence.list_all()}
    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    items = [serialize_presence_item(stores, u, presences=presences, rooms=rooms) for u in users]
    return PresenceListResponse(items=items)


@router.get("/me", response_model=PresenceMeResponse)
def my_presence(user: ActiveUser, stores: AppStores) -> PresenceMeResponse:
    presences = {p.user_id: p for p in stores.presence.list_all()}
    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    return PresenceMeResponse.model_validate(
        serialize_presence_item(stores, user, presences=presences, rooms=rooms)
    )


@router.post("/status", response_model=PresenceItem)
def update_status(payload: ChangeStatusRequest, actor: ActiveUser, stores: AppStores) -> PresenceItem:
    target = resolve_target_user(stores, actor, payload.target_user_id)
    presence = change_status(stores, actor=actor, target=target, to_status=payload.to_status)
    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    return serialize_presence_item(stores, target, presence=presence, rooms=rooms)


def serialize_presence_item(
    stores: AppStores,
    user: UserRecord,
    *,
    presence: PresenceRecord | None = None,
    presences: dict[str, PresenceRecord] | None = None,
    rooms: dict[int, object] | None = None,
) -> PresenceItem:
    if presence is None and presences is not None:
        presence = presences.get(user.user_id)

    if rooms is None:
        rooms = {r.id: r for r in stores.rooms.list_rooms()}
    room = rooms.get(user.room_id) if user.room_id else None

    if presence is None:
        return PresenceItem(
            user_id=user.user_id,
            display_name=user.display_name,
            academic_year=user.academic_year,
            room_id=user.room_id,
            room_name=room.name if room else None,
            current_status="Off Campus",
            current_session_id=None,
            last_changed_at=None,
            today_check_in_at=None,
        )

    open_session: SessionRecord | None = None
    if presence.current_session_id is not None:
        open_session = stores.sessions.get_by_id(presence.current_session_id)

    today_check_in_at = None
    if open_session is not None and open_session.check_in_at.date() == datetime.now(timezone.utc).date():
        today_check_in_at = open_session.check_in_at

    return PresenceItem(
        user_id=user.user_id,
        display_name=user.display_name,
        academic_year=user.academic_year,
        room_id=user.room_id,
        room_name=room.name if room else None,
        current_status=presence.current_status,
        current_session_id=presence.current_session_id,
        last_changed_at=normalize_optional_datetime(presence.last_changed_at),
        today_check_in_at=normalize_optional_datetime(today_check_in_at),
    )


def normalize_optional_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return normalize_datetime(value)
