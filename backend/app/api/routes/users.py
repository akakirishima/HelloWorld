from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, DbSession
from app.core.security import get_password_hash
from app.models.presence_latest import PresenceLatest
from app.models.room import Room
from app.models.user import User
from app.schemas.users import CreateUserRequest, UpdateUserRequest, UserListResponse, UserResponse
from app.services.attendance_service import normalize_datetime
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/users")


@router.get("", response_model=UserListResponse)
def list_users(_: AdminUser, db: DbSession) -> UserListResponse:
    users = db.query(User).order_by(User.role.desc(), User.display_name.asc()).all()
    return UserListResponse(items=[serialize_user(user) for user in users])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserRequest, admin: AdminUser, db: DbSession) -> UserResponse:
    if db.query(User).filter(User.user_id == payload.user_id).one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="user_id already exists.")

    room = resolve_room(db, payload.room_id)
    user = User(
        user_id=payload.user_id,
        full_name=payload.full_name,
        display_name=payload.display_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        affiliation="",
        academic_year=payload.academic_year,
        room_id=room.id if room else None,
        must_change_password=True,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    db.add(
        PresenceLatest(
            user_id=user.id,
            current_status="Off Campus",
            current_session_id=None,
            last_changed_at=datetime.now(timezone.utc),
        )
    )
    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="user_create",
        target_type="users",
        target_id=user.user_id,
        after_json={"user_id": user.user_id, "room_id": user.room_id, "role": user.role},
    )
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    admin: AdminUser,
    db: DbSession,
) -> UserResponse:
    user = db.query(User).filter(User.user_id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    before = serialize_user(user).model_dump()
    data = payload.model_dump(exclude_unset=True)

    if "room_id" in data:
        room = resolve_room(db, data["room_id"])
        user.room_id = room.id if room else None
        data.pop("room_id")

    if "password" in data:
        user.password_hash = get_password_hash(data.pop("password"))
        user.must_change_password = True

    for field, value in data.items():
        setattr(user, field, value)

    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="user_update",
        target_type="users",
        target_id=user.user_id,
        before_json=before,
        after_json=serialize_user(user).model_dump(),
    )
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.post("/{user_id}/disable", response_model=UserResponse)
def disable_user(user_id: str, admin: AdminUser, db: DbSession) -> UserResponse:
    user = db.query(User).filter(User.user_id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    before = serialize_user(user).model_dump()
    user.is_active = False
    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="user_disable",
        target_type="users",
        target_id=user.user_id,
        before_json=before,
        after_json=serialize_user(user).model_dump(),
    )
    db.commit()
    db.refresh(user)
    return serialize_user(user)


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        user_id=user.user_id,
        full_name=user.full_name,
        display_name=user.display_name,
        role=user.role,
        academic_year=user.academic_year,
        room_id=user.room_id,
        room_name=user.room.name if user.room else None,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        last_login_at=normalize_datetime(user.last_login_at) if user.last_login_at else None,
        presence={
            "current_status": user.presence.current_status,
            "last_changed_at": normalize_datetime(user.presence.last_changed_at),
        }
        if user.presence
        else None,
    )


def resolve_room(db: DbSession, room_id: int | None) -> Room | None:
    if room_id is None:
        return None
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
    return room
