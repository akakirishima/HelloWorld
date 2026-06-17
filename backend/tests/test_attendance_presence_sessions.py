from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.constants import PresenceStatus, UserRole
from app.core.security import get_password_hash
from app.db.sqlite_db import SqliteDb
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.models.user import UserRecord
from app.services.attendance_service import (
    build_weekly_attendance_summary,
    change_status,
    check_in,
    check_out,
    patch_session_by_admin,
    resolve_target_user,
)
from app.store import make_stores


def test_member_self_attendance_and_session_flow(tmp_path: Path) -> None:
    stores, admin, member = _setup_stores(tmp_path)

    target = resolve_target_user(stores, member, None)
    assert target.user_id == member.user_id

    presence = check_in(stores, actor=member, target=member, initial_status=PresenceStatus.ROOM.value)
    assert presence.current_status == PresenceStatus.ROOM.value
    assert presence.current_session_id is not None

    duplicate_check_in = _call_exc(
        lambda: check_in(stores, actor=member, target=member, initial_status=PresenceStatus.ROOM.value)
    )
    assert duplicate_check_in is not None

    status = change_status(stores, actor=member, target=member, to_status=PresenceStatus.CLASS.value)
    assert status.current_status == PresenceStatus.CLASS.value

    invalid_status = _call_exc(lambda: change_status(stores, actor=member, target=member, to_status=PresenceStatus.OFF_CAMPUS.value))
    assert invalid_status is not None

    presence = check_out(stores, actor=member, target=member)
    assert presence.current_status == PresenceStatus.OFF_CAMPUS.value
    assert presence.current_session_id is None

    duplicate_check_out = _call_exc(lambda: check_out(stores, actor=member, target=member))
    assert duplicate_check_out is not None

    sessions = stores.sessions.list_by_user(member.user_id)
    assert sessions[0].close_reason == "manual_checkout"
    assert sessions[0].check_out_at is not None

    actions = _audit_actions(stores, member.user_id)
    assert {"check_in", "status_change", "check_out"}.issubset(actions)


def test_target_user_permission_and_admin_updates(tmp_path: Path) -> None:
    stores, admin, actor, target = _setup_stores(tmp_path, include_target=True)

    forbidden = _call_exc(lambda: resolve_target_user(stores, actor, target.user_id))
    assert forbidden is not None

    resolved = resolve_target_user(stores, admin, target.user_id)
    assert resolved.user_id == target.user_id

    presence = check_in(stores, actor=admin, target=target, initial_status=PresenceStatus.ON_CAMPUS.value)
    assert presence.current_status == PresenceStatus.ON_CAMPUS.value

    presence = change_status(stores, actor=admin, target=target, to_status=PresenceStatus.SEMINAR.value)
    assert presence.current_status == PresenceStatus.SEMINAR.value

    presence = check_out(stores, actor=admin, target=target)
    assert presence.current_status == PresenceStatus.OFF_CAMPUS.value

    sessions = stores.sessions.list_by_user(target.user_id)
    assert sessions[0].user_id == target.user_id


def test_patch_session_validations_and_audit_log(tmp_path: Path) -> None:
    stores, admin, member = _setup_stores(tmp_path)

    check_in(stores, actor=admin, target=member, initial_status=PresenceStatus.ROOM.value)
    check_out(stores, actor=admin, target=member)

    session_obj = stores.sessions.list_by_user(member.user_id)[0]
    original_check_in = session_obj.check_in_at

    invalid = _call_exc(
        lambda: patch_session_by_admin(
            stores,
            actor=admin,
            session_obj=session_obj,
            reason="時刻整合性チェック",
            check_in_at=original_check_in + timedelta(hours=2),
            check_out_at_set=True,
            check_out_at=original_check_in + timedelta(hours=1),
        )
    )
    assert invalid is not None

    corrected_check_in = original_check_in - timedelta(minutes=10)
    updated = patch_session_by_admin(
        stores,
        actor=admin,
        session_obj=session_obj,
        reason="退勤漏れ修正",
        check_in_at=corrected_check_in,
        check_out_at_set=False,
        check_out_at=None,
    )
    assert updated.close_reason == "admin_correction"

    audit_rows = stores.audit.list_recent(limit=20)
    log = next(
        row for row in audit_rows
        if row.action == "session_patch" and row.target_type == "sessions" and row.target_id == updated.id
    )
    assert log.reason == "退勤漏れ修正"


def test_weekly_attendance_summary_uses_jst_ranges_and_open_sessions(tmp_path: Path) -> None:
    stores, admin, member, target = _setup_stores(tmp_path, include_target=True)
    now = datetime(2026, 4, 15, 3, 0, tzinfo=timezone.utc)  # 2026-04-15 12:00 JST

    _add_session(
        stores,
        "member-mon",
        member.user_id,
        datetime(2026, 4, 13, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 13, 4, 0, tzinfo=timezone.utc),
    )
    _add_session(
        stores,
        "member-cross-day",
        member.user_id,
        datetime(2026, 4, 14, 14, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 14, 16, 0, tzinfo=timezone.utc),
    )
    _add_session(
        stores,
        "target-cross-week-start",
        target.user_id,
        datetime(2026, 4, 12, 14, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 12, 16, 0, tzinfo=timezone.utc),
    )
    _add_session(
        stores,
        "target-open",
        target.user_id,
        datetime(2026, 4, 15, 0, 0, tzinfo=timezone.utc),
        None,
    )
    _add_session(
        stores,
        "ignored-before-week",
        member.user_id,
        datetime(2026, 4, 11, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 11, 2, 0, tzinfo=timezone.utc),
    )

    summary = build_weekly_attendance_summary(stores, now=now)
    by_user = {item.user_id: item for item in summary}

    assert by_user[member.user_id].weekly_duration_sec == 6 * 60 * 60
    assert by_user[member.user_id].today_duration_sec == 1 * 60 * 60
    assert by_user[target.user_id].weekly_duration_sec == 4 * 60 * 60
    assert by_user[target.user_id].today_duration_sec == 3 * 60 * 60
    assert by_user[member.user_id].rank == 1
    assert by_user[target.user_id].rank == 2
    assert admin.user_id not in by_user


def _setup_stores(tmp_path: Path, *, include_target: bool = False):
    db = SqliteDb(tmp_path / "local.db")
    stores = make_stores(tmp_path, sqlite_db=db)
    stores.rooms.ensure_lab_and_rooms("Lab", [{"name": "E103", "display_order": 1}])
    room = stores.rooms.list_rooms()[0]

    now = datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)
    admin = _create_user(stores, "admin-user", "Admin User", UserRole.ADMIN.value, room.id, now)
    member = _create_user(stores, "member-user", "Member User", UserRole.MEMBER.value, room.id, now)
    if include_target:
        target = _create_user(stores, "target-user", "Target User", UserRole.MEMBER.value, room.id, now)
        return stores, admin, member, target
    return stores, admin, member


def _create_user(
    stores,
    user_id: str,
    display_name: str,
    role: str,
    room_id: int,
    now: datetime,
) -> UserRecord:
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


def _add_session(
    stores,
    session_id: str,
    user_id: str,
    check_in_at: datetime,
    check_out_at: datetime | None,
) -> SessionRecord:
    duration_sec = None
    if check_out_at is not None:
        duration_sec = int((check_out_at - check_in_at).total_seconds())
    session_obj = SessionRecord(
        id=session_id,
        user_id=user_id,
        check_in_at=check_in_at,
        check_out_at=check_out_at,
        duration_sec=duration_sec,
        close_reason="manual_checkout" if check_out_at is not None else None,
        created_at=check_in_at,
        updated_at=check_out_at or check_in_at,
    )
    return stores.sessions.add(session_obj)


def _audit_actions(stores, user_id: str) -> set[str]:
    return {
        row.action
        for row in stores.audit.list_recent(limit=200)
        if row.target_type == "users" and row.target_id == user_id
    }


def _call_exc(func):
    try:
        func()
    except Exception as exc:  # noqa: BLE001
        return exc
    return None
