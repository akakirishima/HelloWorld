from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import ActiveUser, AdminUser, AppStores
from app.models.session import SessionRecord
from app.schemas.sessions import PatchSessionRequest, SessionItem, SessionListResponse
from app.services.attendance_service import normalize_datetime, patch_session_by_admin

router = APIRouter(prefix="/sessions")


@router.get("/me", response_model=SessionListResponse)
def my_sessions(user: ActiveUser, stores: AppStores) -> SessionListResponse:
    sessions = stores.sessions.list_by_user(user.user_id)
    users = {u.user_id: u for u in stores.users.list_all()}
    return SessionListResponse(items=[serialize_session_item(s, users) for s in sessions])


@router.get("", response_model=SessionListResponse)
def list_sessions(_: AdminUser, stores: AppStores) -> SessionListResponse:
    sessions = stores.sessions.list_all()
    users = {u.user_id: u for u in stores.users.list_all()}
    return SessionListResponse(items=[serialize_session_item(s, users) for s in sessions])


@router.patch("/{session_id}", response_model=SessionItem)
def patch_session(
    session_id: str,
    payload: PatchSessionRequest,
    admin: AdminUser,
    stores: AppStores,
) -> SessionItem:
    session_obj = stores.sessions.get_by_id(session_id)
    if session_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    updated = patch_session_by_admin(
        stores,
        actor=admin,
        session_obj=session_obj,
        reason=payload.reason,
        check_in_at=payload.check_in_at,
        check_out_at_set="check_out_at" in payload.model_fields_set,
        check_out_at=payload.check_out_at,
    )
    users = {u.user_id: u for u in stores.users.list_all()}
    return serialize_session_item(updated, users)


def serialize_session_item(session_obj: SessionRecord, users: dict) -> SessionItem:
    user = users.get(session_obj.user_id)
    return SessionItem(
        id=session_obj.id,
        user_id=session_obj.user_id,
        display_name=user.display_name if user else session_obj.user_id,
        check_in_at=normalize_datetime(session_obj.check_in_at),
        check_out_at=normalize_datetime(session_obj.check_out_at) if session_obj.check_out_at else None,
        duration_sec=session_obj.duration_sec,
        close_reason=session_obj.close_reason,
    )
