from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.audit_log import AuditLogRecord
from app.models.lab import LabRecord
from app.models.presence_latest import PresenceRecord
from app.models.room import RoomRecord
from app.models.session import SessionRecord
from app.models.status_change import StatusChangeRecord
from app.models.user import UserRecord
from app.services import bootstrap_service
from app.store.audit_store import AuditStore
from app.store.presence_store import PresenceStore
from app.store.room_store import RoomStore
from app.store.session_store import SessionStore
from app.store.status_change_store import StatusChangeStore
from app.store.user_store import UserStore


def _now() -> datetime:
    return datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)


def test_user_store_save_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = UserStore(tmp_path, sqlite_db=db)
        user = UserRecord(
            user_id="u1",
            full_name="Test User",
            display_name="Test User",
            password_hash="hash",
            role="member",
            created_at=_now(),
            updated_at=_now(),
        )

        store.save(user)

        assert not (tmp_path / "users.json").exists()
        row = db.execute(
            "SELECT display_name FROM users WHERE user_id = ?",
            ("u1",),
        ).fetchone()
        assert row["display_name"] == "Test User"
    finally:
        db.close()


def test_room_store_save_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = RoomStore(tmp_path, sqlite_db=db)
        lab = LabRecord(id=1, name="Lab", created_at=_now(), updated_at=_now())
        room = RoomRecord(
            id=1,
            lab_id=1,
            name="E103",
            display_order=1,
            is_active=True,
            created_at=_now(),
            updated_at=_now(),
        )

        store.save_lab(lab)
        store.save_room(room)

        assert not (tmp_path / "rooms.json").exists()
        lab_row = db.execute("SELECT name FROM lab WHERE id = 1").fetchone()
        room_row = db.execute("SELECT name FROM rooms WHERE id = 1").fetchone()
        assert lab_row["name"] == "Lab"
        assert room_row["name"] == "E103"
    finally:
        db.close()


def test_presence_store_save_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = PresenceStore(tmp_path, sqlite_db=db)
        presence = PresenceRecord(
            user_id="u1",
            current_status="Room",
            current_session_id="s1",
            last_changed_at=_now(),
            updated_at=_now(),
        )

        store.save(presence)

        assert not (tmp_path / "presence.json").exists()
        row = db.execute(
            "SELECT current_status, current_session_id FROM presence WHERE user_id = ?",
            ("u1",),
        ).fetchone()
        assert row["current_status"] == "Room"
        assert row["current_session_id"] == "s1"
    finally:
        db.close()


def test_session_store_add_and_update_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = SessionStore(tmp_path, sqlite_db=db)
        session = SessionRecord(
            id="session-1",
            user_id="u1",
            check_in_at=_now(),
            check_out_at=None,
            duration_sec=None,
            close_reason=None,
            created_at=_now(),
            updated_at=_now(),
        )

        inserted = store.add(session)
        updated = store.update(inserted.model_copy(update={
            "check_out_at": _now(),
            "duration_sec": 3600,
            "close_reason": "manual_checkout",
        }))

        assert not (tmp_path / "sessions").exists()
        row = db.execute(
            "SELECT check_out_at, duration_sec, close_reason FROM sessions WHERE id = ?",
            ("session-1",),
        ).fetchone()
        assert row["close_reason"] == "manual_checkout"
        assert row["duration_sec"] == 3600
        assert updated.id == "session-1"
    finally:
        db.close()


def test_status_change_store_append_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = StatusChangeStore(tmp_path, sqlite_db=db)
        record = StatusChangeRecord(
            id="sc-1",
            user_id="u1",
            session_id="s1",
            from_status="Off Campus",
            to_status="Room",
            changed_at=_now(),
            changed_by="admin",
            source="web",
        )

        store.append(record)

        assert not (tmp_path / "status_changes").exists()
        row = db.execute(
            "SELECT to_status, changed_by FROM status_changes WHERE id = ?",
            ("sc-1",),
        ).fetchone()
        assert row["to_status"] == "Room"
        assert row["changed_by"] == "admin"
    finally:
        db.close()


def test_audit_store_append_writes_only_sqlite(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        store = AuditStore(tmp_path, sqlite_db=db)
        record = AuditLogRecord(
            id="audit-1",
            actor_user_id="admin",
            action="user_update",
            target_type="users",
            target_id="u1",
            before_json='{"name":"before"}',
            after_json='{"name":"after"}',
            reason="fix",
            created_at=_now(),
        )

        store.append(record)

        assert not (tmp_path / "audit_logs").exists()
        rows = store.list_recent(limit=10)
        assert rows[0].action == "user_update"
        row = db.execute(
            "SELECT action, target_id FROM audit_logs WHERE id = ?",
            ("audit-1",),
        ).fetchone()
        assert row["target_id"] == "u1"
    finally:
        db.close()


def test_seed_does_not_auto_generate_contact_time_workbooks(monkeypatch, tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "local.db")
    try:
        monkeypatch.setattr(
            bootstrap_service,
            "ROOMS",
            ({"name": "E103", "display_order": 1},),
        )
        monkeypatch.setattr(
            bootstrap_service,
            "SAMPLE_USERS",
            (
                {
                    "user_id": "sample-user",
                    "full_name": "Sample User",
                    "display_name": "Sample User",
                    "role": "member",
                    "academic_year": "M1",
                    "password": "password1234",
                    "room_name": "E103",
                    "must_change_password": False,
                    "current_status": "Off Campus",
                },
            ),
        )

        bootstrap_service.run_seed(tmp_path, tmp_path / "contact", sqlite_db=db)

        assert not (tmp_path / "contact").exists()
        assert not (tmp_path / "users.json").exists()
        assert not (tmp_path / "rooms.json").exists()
    finally:
        db.close()
