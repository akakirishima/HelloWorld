from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import ActiveUser, AppStores
from app.api.routes.presence import serialize_presence_item
from app.schemas.attendance import CheckInRequest, CheckOutRequest
from app.schemas.presence import PresenceItem
from app.services.attendance_service import check_in, check_out, resolve_target_user

router = APIRouter(prefix="/attendance")


@router.post("/check-in", response_model=PresenceItem)
def check_in_route(payload: CheckInRequest, actor: ActiveUser, stores: AppStores) -> PresenceItem:
    target = resolve_target_user(stores, actor, payload.target_user_id)
    presence = check_in(stores, actor=actor, target=target, initial_status=payload.initial_status)
    return serialize_presence_item(stores, target, presence=presence)


@router.post("/check-out", response_model=PresenceItem)
def check_out_route(payload: CheckOutRequest, actor: ActiveUser, stores: AppStores) -> PresenceItem:
    target = resolve_target_user(stores, actor, payload.target_user_id)
    presence = check_out(stores, actor=actor, target=target)
    return serialize_presence_item(stores, target, presence=presence)
