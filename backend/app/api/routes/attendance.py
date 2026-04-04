from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ActiveUser, DbSession
from app.schemas.attendance import CheckInRequest, CheckOutRequest
from app.schemas.presence import PresenceItem
from app.services.attendance_service import check_in, check_out, resolve_target_user
from app.api.routes.presence import serialize_presence_item

router = APIRouter(prefix="/attendance")


@router.post("/check-in", response_model=PresenceItem)
def check_in_route(payload: CheckInRequest, actor: ActiveUser, db: DbSession) -> PresenceItem:
    target = resolve_target_user(db, actor, payload.target_user_id)
    presence = check_in(db, actor=actor, target=target, initial_status=payload.initial_status)
    return serialize_presence_item(db, target, presence=presence)


@router.post("/check-out", response_model=PresenceItem)
def check_out_route(payload: CheckOutRequest, actor: ActiveUser, db: DbSession) -> PresenceItem:
    target = resolve_target_user(db, actor, payload.target_user_id)
    presence = check_out(db, actor=actor, target=target)
    return serialize_presence_item(db, target, presence=presence)
