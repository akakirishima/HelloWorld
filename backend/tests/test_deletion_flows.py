from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.routes.settings import delete_room
from app.api.routes.users import delete_user
from app.core.constants import PresenceStatus, UserRole
from app.core.security import get_password_hash
from app.db.sqlite_db import SqliteDb
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.models.user import UserRecord
from app.store import make_stores
from app.store.note_store import NoteStore


def test_delete_user_removes_all_related_sqlite_rows(tmp_path: Path) -> None:
    stores = _setup_stores(tmp_path)
    try:
        admin = _create_user(stores, "admin", "Admin User", UserRole.ADMIN.value, room_id=2)
        member = _create_user(stores, "member", "Member User", UserRole.MEMBER.value, room_id=1)
        note_store = NoteStore(root=tmp_path, user_id=member.user_id, sqlite_db=stores.sqlite_db)

        note = note_store.create_note(
            note_date=datetime.now(timezone.utc).date(),
            title="メモ",
            did_today="today",
            future_tasks="tomorrow",
        )
        stores.sessions.add(
            SessionRecord(
                id="session-1",
                user_id=member.user_id,
                check_in_at=_now(),
                check_out_at=None,
                duration_sec=None,
                close_reason=None,
                created_at=_now(),
                updated_at=_now(),
            )
        )

        delete_user(member.user_id, admin, stores)

        assert stores.users.get_by_user_id(member.user_id) is None
        assert stores.presence.get(member.user_id) is None
        assert stores.sessions.list_by_user(member.user_id) == []
        assert note_store.get_note(note.id) is None
    finally:
        stores.sqlite_db.close()


def test_delete_room_requires_no_assigned_members(tmp_path: Path) -> None:
    stores = _setup_stores(tmp_path)
    try:
        admin = _create_user(stores, "admin", "Admin User", UserRole.ADMIN.value, room_id=2)
        member = _create_user(stores, "member", "Member User", UserRole.MEMBER.value, room_id=1)

        with pytest.raises(HTTPException) as exc_info:
            delete_room(1, admin, stores)
        assert exc_info.value.status_code == 409

        updated_member = stores.users.save(member.model_copy(update={"room_id": 2}))
        delete_room(1, admin, stores)

        assert stores.rooms.get_room(1) is None
        assert stores.rooms.get_room(2) is not None
        assert stores.users.get_by_user_id(member.user_id).room_id == updated_member.room_id
    finally:
        stores.sqlite_db.close()


def _setup_stores(tmp_path: Path):
    db = SqliteDb(tmp_path / "local.db")
    stores = make_stores(tmp_path, sqlite_db=db)
    stores.rooms.ensure_lab_and_rooms(
        "Lab",
        [
            {"name": "E103", "display_order": 1},
            {"name": "E104", "display_order": 2},
        ],
    )
    return stores


def _create_user(
    stores,
    user_id: str,
    display_name: str,
    role: str,
    room_id: int,
) -> UserRecord:
    now = _now()
    user = UserRecord(
        user_id=user_id,
        full_name=display_name,
        display_name=display_name,
        password_hash=get_password_hash("Password1234"),
        role=role,
        affiliation="",
        academic_year="M1",
        room_id=room_id,
        must_change_password=False,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    stores.users.save(user)
    stores.presence.save(
        PresenceRecord(
            user_id=user_id,
            current_status=PresenceStatus.OFF_CAMPUS.value,
            current_session_id=None,
            last_changed_at=now,
            updated_at=now,
        )
    )
    return user


def _now() -> datetime:
    return datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)
