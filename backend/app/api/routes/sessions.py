from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import ActiveUser, AdminUser, DbSession
from app.models.session import Session
from app.models.user import User
from app.schemas.sessions import PatchSessionRequest, SessionItem, SessionListResponse
from app.services.attendance_service import normalize_datetime, patch_session_by_admin

router = APIRouter(prefix="/sessions")


@router.get("/me", response_model=SessionListResponse)
def my_sessions(user: ActiveUser, db: DbSession) -> SessionListResponse:
    sessions = (
        db.query(Session)
        .filter(Session.user_id == user.id)
        .order_by(Session.check_in_at.desc())
        .all()
    )
    return SessionListResponse(items=[serialize_session_item(item) for item in sessions])


@router.get("", response_model=SessionListResponse)
def list_sessions(_: AdminUser, db: DbSession) -> SessionListResponse:
    sessions = db.query(Session).join(User).order_by(Session.check_in_at.desc()).all()
    return SessionListResponse(items=[serialize_session_item(item) for item in sessions])


@router.patch("/{session_id}", response_model=SessionItem)
def patch_session(
    session_id: int,
    payload: PatchSessionRequest,
    admin: AdminUser,
    db: DbSession,
) -> SessionItem:
    session_obj = db.get(Session, session_id)
    if session_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    updated = patch_session_by_admin(
        db,
        actor=admin,
        session_obj=session_obj,
        reason=payload.reason,
        check_in_at=payload.check_in_at,
        check_out_at_set="check_out_at" in payload.model_fields_set,
        check_out_at=payload.check_out_at,
    )
    return serialize_session_item(updated)


def serialize_session_item(session_obj: Session) -> SessionItem:
    return SessionItem(
        id=session_obj.id,
        user_id=session_obj.user.user_id,
        display_name=session_obj.user.display_name,
        check_in_at=normalize_datetime(session_obj.check_in_at),
        check_out_at=normalize_datetime(session_obj.check_out_at) if session_obj.check_out_at else None,
        duration_sec=session_obj.duration_sec,
        close_reason=session_obj.close_reason,
    )
