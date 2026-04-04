from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_admin_auth_and_member_creation_flow() -> None:
    suffix = uuid4().hex[:8]
    room_name = f"部屋{suffix}"
    user_id = f"member_{suffix}"
    password = f"Init{suffix}99"
    next_password = f"Changed{suffix}99"

    with TestClient(app) as client:
        login_response = client.post(
            "/api/auth/login",
            json={"user_id": "admin", "password": "admin1234"},
        )
        assert login_response.status_code == 200
        assert login_response.json()["user"]["role"] == "admin"

        lab_response = client.get("/api/settings/lab")
        assert lab_response.status_code == 200
        original_lab_name = lab_response.json()["name"]

        update_lab_response = client.patch(
            "/api/settings/lab",
            json={"name": f"{original_lab_name} テスト"},
        )
        assert update_lab_response.status_code == 200
        assert update_lab_response.json()["name"].endswith("テスト")

        restore_lab_response = client.patch(
            "/api/settings/lab",
            json={"name": original_lab_name},
        )
        assert restore_lab_response.status_code == 200
        assert restore_lab_response.json()["name"] == original_lab_name

        create_room_response = client.post(
            "/api/rooms",
            json={"name": room_name, "display_order": 99, "is_active": True},
        )
        assert create_room_response.status_code == 201
        room_payload = create_room_response.json()

        create_user_response = client.post(
            "/api/users",
            json={
                "user_id": user_id,
                "full_name": "Flow Test Member",
                "display_name": "フローテスト",
                "password": password,
                "role": "member",
                "academic_year": "M1",
                "room_id": room_payload["id"],
                "is_active": True,
            },
        )
        assert create_user_response.status_code == 201
        assert create_user_response.json()["must_change_password"] is True

        disable_early = client.post(f"/api/users/{user_id}/disable")
        assert disable_early.status_code == 200
        assert disable_early.json()["is_active"] is False

        client.post("/api/auth/logout")
        disabled_login_response = client.post(
            "/api/auth/login",
            json={"user_id": user_id, "password": password},
        )
        assert disabled_login_response.status_code == 403

        relogin_admin = client.post(
            "/api/auth/login",
            json={"user_id": "admin", "password": "admin1234"},
        )
        assert relogin_admin.status_code == 200

        enable_user_response = client.patch(
            f"/api/users/{user_id}",
            json={"is_active": True},
        )
        assert enable_user_response.status_code == 200
        assert enable_user_response.json()["is_active"] is True

        client.post("/api/auth/logout")
        member_login_response = client.post(
            "/api/auth/login",
            json={"user_id": user_id, "password": password},
        )
        assert member_login_response.status_code == 200
        assert member_login_response.json()["user"]["must_change_password"] is True

        me_response = client.get("/api/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["user_id"] == user_id

        blocked_response = client.get("/api/users")
        assert blocked_response.status_code == 403

        change_password_response = client.post(
            "/api/auth/change-password",
            json={"current_password": password, "new_password": next_password},
        )
        assert change_password_response.status_code == 200
        assert change_password_response.json()["user"]["must_change_password"] is False

        client.post("/api/auth/logout")
        relogin_member_response = client.post(
            "/api/auth/login",
            json={"user_id": user_id, "password": next_password},
        )
        assert relogin_member_response.status_code == 200
        assert relogin_member_response.json()["user"]["must_change_password"] is False
