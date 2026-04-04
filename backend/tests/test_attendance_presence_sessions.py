from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.audit_log import AuditLog


def test_member_self_attendance_and_session_flow() -> None:
    suffix = uuid4().hex[:8]
    user_id = f"member_att_{suffix}"
    initial_password = f"Init{suffix}99"
    changed_password = f"Changed{suffix}99"

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")
        room_id = _first_room_id(client)
        _create_member(client, user_id=user_id, password=initial_password, room_id=room_id)
        _logout(client)

        _login(client, user_id, initial_password)
        change_password_response = client.post(
            "/api/auth/change-password",
            json={"current_password": initial_password, "new_password": changed_password},
        )
        assert change_password_response.status_code == 200
        _logout(client)

        _login(client, user_id, changed_password)

        presence_forbidden = client.get("/api/presence")
        assert presence_forbidden.status_code == 403

        check_in_response = client.post("/api/attendance/check-in", json={"initial_status": "Room"})
        assert check_in_response.status_code == 200
        assert check_in_response.json()["current_status"] == "Room"
        assert check_in_response.json()["current_session_id"] is not None

        duplicate_check_in = client.post("/api/attendance/check-in", json={"initial_status": "Room"})
        assert duplicate_check_in.status_code == 400

        status_response = client.post("/api/presence/status", json={"to_status": "Class"})
        assert status_response.status_code == 200
        assert status_response.json()["current_status"] == "Class"

        invalid_status_response = client.post("/api/presence/status", json={"to_status": "Off Campus"})
        assert invalid_status_response.status_code == 400

        check_out_response = client.post("/api/attendance/check-out", json={})
        assert check_out_response.status_code == 200
        assert check_out_response.json()["current_status"] == "Off Campus"
        assert check_out_response.json()["current_session_id"] is None

        duplicate_check_out = client.post("/api/attendance/check-out", json={})
        assert duplicate_check_out.status_code == 400

        sessions_me = client.get("/api/sessions/me")
        assert sessions_me.status_code == 200
        latest = sessions_me.json()["items"][0]
        assert latest["close_reason"] == "manual_checkout"
        assert latest["check_out_at"] is not None

        _logout(client)

    with SessionLocal() as db:
        actions = (
            db.query(AuditLog.action)
            .filter(
                AuditLog.target_type == "users",
                AuditLog.target_id == user_id,
                AuditLog.action.in_(["check_in", "status_change", "check_out"]),
            )
            .all()
        )
        action_names = {item[0] for item in actions}
        assert {"check_in", "status_change", "check_out"}.issubset(action_names)


def test_target_user_permission_and_admin_updates() -> None:
    suffix = uuid4().hex[:8]
    actor_user_id = f"member_actor_{suffix}"
    actor_password = f"Actor{suffix}99"
    actor_changed = f"ActorChanged{suffix}99"
    target_user_id = f"member_target_{suffix}"
    target_password = f"Target{suffix}99"

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")
        room_id = _first_room_id(client)
        _create_member(client, user_id=actor_user_id, password=actor_password, room_id=room_id)
        _create_member(client, user_id=target_user_id, password=target_password, room_id=room_id)
        _logout(client)

        _login(client, actor_user_id, actor_password)
        change_password_response = client.post(
            "/api/auth/change-password",
            json={"current_password": actor_password, "new_password": actor_changed},
        )
        assert change_password_response.status_code == 200
        _logout(client)

        _login(client, actor_user_id, actor_changed)
        forbidden_check_in = client.post(
            "/api/attendance/check-in",
            json={"target_user_id": target_user_id, "initial_status": "Room"},
        )
        assert forbidden_check_in.status_code == 403
        forbidden_status = client.post(
            "/api/presence/status",
            json={"target_user_id": target_user_id, "to_status": "Class"},
        )
        assert forbidden_status.status_code == 403
        _logout(client)

        _login(client, "admin", "admin1234")
        admin_check_in = client.post(
            "/api/attendance/check-in",
            json={"target_user_id": target_user_id, "initial_status": "On Campus"},
        )
        assert admin_check_in.status_code == 200
        assert admin_check_in.json()["current_status"] == "On Campus"

        admin_status = client.post(
            "/api/presence/status",
            json={"target_user_id": target_user_id, "to_status": "Seminar"},
        )
        assert admin_status.status_code == 200
        assert admin_status.json()["current_status"] == "Seminar"

        admin_check_out = client.post(
            "/api/attendance/check-out",
            json={"target_user_id": target_user_id},
        )
        assert admin_check_out.status_code == 200
        assert admin_check_out.json()["current_status"] == "Off Campus"

        list_sessions = client.get("/api/sessions")
        assert list_sessions.status_code == 200
        assert any(item["user_id"] == target_user_id for item in list_sessions.json()["items"])
        _logout(client)


def test_patch_session_validations_and_audit_log() -> None:
    suffix = uuid4().hex[:8]
    target_user_id = f"member_patch_{suffix}"
    password = f"Patch{suffix}99"

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")
        room_id = _first_room_id(client)
        _create_member(client, user_id=target_user_id, password=password, room_id=room_id)

        check_in_response = client.post(
            "/api/attendance/check-in",
            json={"target_user_id": target_user_id, "initial_status": "Room"},
        )
        assert check_in_response.status_code == 200
        check_out_response = client.post(
            "/api/attendance/check-out",
            json={"target_user_id": target_user_id},
        )
        assert check_out_response.status_code == 200

        sessions_response = client.get("/api/sessions")
        assert sessions_response.status_code == 200
        session_row = next(item for item in sessions_response.json()["items"] if item["user_id"] == target_user_id)
        session_id = session_row["id"]
        original_check_in = datetime.fromisoformat(session_row["check_in_at"])

        reason_missing = client.patch(
            f"/api/sessions/{session_id}",
            json={"check_in_at": (original_check_in + timedelta(minutes=5)).isoformat()},
        )
        assert reason_missing.status_code == 422

        invalid_time = client.patch(
            f"/api/sessions/{session_id}",
            json={
                "check_in_at": (original_check_in + timedelta(hours=2)).isoformat(),
                "check_out_at": (original_check_in + timedelta(hours=1)).isoformat(),
                "reason": "時刻整合性チェック",
            },
        )
        assert invalid_time.status_code == 400

        corrected_check_in = (original_check_in - timedelta(minutes=10)).astimezone(timezone.utc)
        patch_ok = client.patch(
            f"/api/sessions/{session_id}",
            json={
                "check_in_at": corrected_check_in.isoformat(),
                "reason": "退勤漏れ修正",
            },
        )
        assert patch_ok.status_code == 200
        assert patch_ok.json()["close_reason"] == "admin_correction"

        _logout(client)

    with SessionLocal() as db:
        log = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "session_patch",
                AuditLog.target_type == "sessions",
                AuditLog.target_id == str(session_id),
            )
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert log is not None
        assert log.reason == "退勤漏れ修正"


def _login(client: TestClient, user_id: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"user_id": user_id, "password": password})
    assert response.status_code == 200


def _logout(client: TestClient) -> None:
    response = client.post("/api/auth/logout")
    assert response.status_code == 200


def _first_room_id(client: TestClient) -> int:
    response = client.get("/api/rooms")
    assert response.status_code == 200
    return int(response.json()["items"][0]["id"])


def _create_member(client: TestClient, *, user_id: str, password: str, room_id: int) -> None:
    response = client.post(
        "/api/users",
        json={
            "user_id": user_id,
            "full_name": f"{user_id} Full Name",
            "display_name": user_id,
            "password": password,
            "role": "member",
            "academic_year": "M1",
            "room_id": room_id,
            "is_active": True,
        },
    )
    assert response.status_code == 201
