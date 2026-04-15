from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, AppStores
from app.core.config import get_settings
from app.core.security import get_password_hash
from app.models.presence_latest import PresenceRecord
from app.models.user import UserRecord
from app.schemas.users import CreateUserRequest, UpdateUserRequest, UserListResponse, UserResponse
from app.services.attendance_service import normalize_datetime
from app.services.audit_service import create_audit_log
from app.store.note_store import NoteStore

router = APIRouter(prefix="/users")


@router.get("", response_model=UserListResponse)
def list_users(_: AdminUser, stores: AppStores) -> UserListResponse:
    users = sorted(
        stores.users.list_all(),
        key=lambda u: (u.role != "admin", u.display_name),
    )
    presences = {p.user_id: p for p in stores.presence.list_all()}
    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    return UserListResponse(items=[serialize_user(u, presences.get(u.user_id), rooms) for u in users])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserRequest, admin: AdminUser, stores: AppStores) -> UserResponse:
    if stores.users.get_by_user_id(payload.user_id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="user_id already exists.")

    if payload.room_id is not None and stores.rooms.get_room(payload.room_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    now = datetime.now(timezone.utc)
    user = UserRecord(
        user_id=payload.user_id,
        full_name=payload.full_name,
        display_name=payload.display_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        affiliation="",
        academic_year=payload.academic_year,
        room_id=payload.room_id,
        must_change_password=True,
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    user = stores.users.save(user)
    stores.presence.save(PresenceRecord(
        user_id=user.user_id,
        current_status="Off Campus",
        current_session_id=None,
        last_changed_at=now,
        updated_at=now,
    ))
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="user_create",
        target_type="users",
        target_id=user.user_id,
        after_json={"user_id": user.user_id, "room_id": user.room_id, "role": user.role},
    )

    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    presences = {p.user_id: p for p in stores.presence.list_all()}
    return serialize_user(user, presences.get(user.user_id), rooms)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    admin: AdminUser,
    stores: AppStores,
) -> UserResponse:
    user = stores.users.get_by_user_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    presences = {p.user_id: p for p in stores.presence.list_all()}
    before = serialize_user(user, presences.get(user.user_id), rooms).model_dump()

    data = payload.model_dump(exclude_unset=True)

    if "room_id" in data:
        room_id = data.pop("room_id")
        if room_id is not None and stores.rooms.get_room(room_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
        data["room_id"] = room_id

    if "password" in data:
        data["password_hash"] = get_password_hash(data.pop("password"))
        data["must_change_password"] = True

    user = stores.users.save(user.model_copy(update=data))
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="user_update",
        target_type="users",
        target_id=user.user_id,
        before_json=before,
        after_json=serialize_user(user, presences.get(user.user_id), rooms).model_dump(),
    )
    return serialize_user(user, presences.get(user.user_id), rooms)


@router.post("/{user_id}/disable", response_model=UserResponse)
def disable_user(user_id: str, admin: AdminUser, stores: AppStores) -> UserResponse:
    user = stores.users.get_by_user_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if admin.user_id == user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot disable your own account.")
    user = stores.users.save(user.model_copy(update={"is_active": False}))
    rooms = {r.id: r for r in stores.rooms.list_rooms()}
    presences = {p.user_id: p for p in stores.presence.list_all()}
    return serialize_user(user, presences.get(user.user_id), rooms)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, admin: AdminUser, stores: AppStores) -> None:
    user = stores.users.get_by_user_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # ガードレール①: 自分自身は削除不可
    if admin.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete your own account.",
        )

    # ガードレール②: 最後の管理者は削除不可
    if user.role == "admin":
        admin_count = sum(1 for u in stores.users.list_all() if u.role == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete the last administrator.",
            )

    # 開いているセッションを強制クローズ
    open_session = stores.sessions.get_open_session(user_id)
    if open_session is not None:
        now = datetime.now(timezone.utc)
        duration = int((now - open_session.check_in_at).total_seconds())
        stores.sessions.update(open_session.model_copy(update={
            "check_out_at": now,
            "duration_sec": duration,
            "close_reason": "user_deleted",
        }))

    # 削除操作を監査ログに記録（SQLite に残る）
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="user_delete",
        target_type="users",
        target_id=user_id,
        before_json={"user_id": user_id, "display_name": user.display_name},
    )

    # 全関連データを削除（末梢 → 中心の順）
    NoteStore(
        root=Path(get_settings().data_root_path),
        user_id=user_id,
        sqlite_db=stores.sqlite_db,
    ).delete_by_user(user_id)
    stores.status_changes.delete_by_user(user_id)
    stores.sessions.delete_by_user(user_id)
    stores.audit.delete_by_user(user_id)
    stores.presence.delete(user_id)
    stores.users.delete(user_id)


def serialize_user(
    user: UserRecord,
    presence: PresenceRecord | None,
    rooms: dict[int, object],
) -> UserResponse:
    room = rooms.get(user.room_id) if user.room_id else None
    return UserResponse(
        user_id=user.user_id,
        full_name=user.full_name,
        display_name=user.display_name,
        role=user.role,
        academic_year=user.academic_year,
        room_id=user.room_id,
        room_name=room.name if room else None,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        last_login_at=normalize_datetime(user.last_login_at) if user.last_login_at else None,
        presence={
            "current_status": presence.current_status,
            "last_changed_at": normalize_datetime(presence.last_changed_at),
        } if presence else None,
    )
