from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import ActiveUser, AppStores, CurrentUser
from app.core.security import get_password_hash, verify_password
from app.models.user import UserRecord
from app.schemas.auth import AuthStatusResponse, ChangePasswordRequest, LoginRequest, MeResponse
from app.services.audit_service import create_audit_log
from app.services.attendance_service import normalize_datetime

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=AuthStatusResponse)
def login(payload: LoginRequest, request: Request, stores: AppStores) -> AuthStatusResponse:
    user = stores.users.get_by_user_id(payload.user_id)

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive.")

    updated = stores.users.save(user.model_copy(update={"last_login_at": datetime.now(timezone.utc)}))
    request.session["user_id"] = updated.user_id

    create_audit_log(
        stores.audit,
        actor_user_id=updated.user_id,
        action="auth_login",
        target_type="users",
        target_id=updated.user_id,
    )
    return AuthStatusResponse(message="Logged in.", user=serialize_user(updated))


@router.post("/logout", response_model=AuthStatusResponse)
def logout(request: Request) -> AuthStatusResponse:
    request.session.clear()
    return AuthStatusResponse(message="Logged out.")


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser) -> MeResponse:
    return serialize_user(user)


@router.post("/change-password", response_model=AuthStatusResponse)
def change_password(
    payload: ChangePasswordRequest,
    stores: AppStores,
    user: CurrentUser,
) -> AuthStatusResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    updated = stores.users.save(user.model_copy(update={
        "password_hash": get_password_hash(payload.new_password),
        "must_change_password": False,
    }))
    create_audit_log(
        stores.audit,
        actor_user_id=updated.user_id,
        action="auth_change_password",
        target_type="users",
        target_id=updated.user_id,
    )
    return AuthStatusResponse(message="Password updated.", user=serialize_user(updated))


def serialize_user(user: UserRecord) -> MeResponse:
    return MeResponse(
        user_id=user.user_id,
        full_name=user.full_name,
        display_name=user.display_name,
        role=user.role,
        academic_year=user.academic_year,
        room_id=user.room_id,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        last_login_at=normalize_datetime(user.last_login_at) if user.last_login_at else None,
    )
