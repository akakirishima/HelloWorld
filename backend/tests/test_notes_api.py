from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services import file_notes_service


def test_notes_crud_filters_and_single_note_per_day(monkeypatch, tmp_path: Path) -> None:
    _use_temp_notes_root(monkeypatch, tmp_path)

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")

        first_create = client.post(
            "/api/notes",
            json={"note_date": "2026-03-08", "title": "論文準備", "body_markdown": "実験計画を更新"},
        )
        assert first_create.status_code == 201
        first_id = first_create.json()["id"]

        note_file = tmp_path / "admin" / "2026" / "2026-03-08.md"
        assert note_file.exists()
        assert '"user_id": "admin"' in note_file.read_text(encoding="utf-8")

        duplicate_create = client.post(
            "/api/notes",
            json={"note_date": "2026-03-08", "title": "", "body_markdown": ""},
        )
        assert duplicate_create.status_code == 409

        second_create = client.post(
            "/api/notes",
            json={"note_date": "2026-03-07", "title": "会議", "body_markdown": "日程調整"},
        )
        assert second_create.status_code == 201
        second_id = second_create.json()["id"]

        filter_by_text = client.get("/api/notes?q=論文")
        assert filter_by_text.status_code == 200
        assert len(filter_by_text.json()["items"]) == 1
        assert filter_by_text.json()["items"][0]["id"] == first_id

        filter_by_date = client.get("/api/notes?date_from=2026-03-08&date_to=2026-03-08")
        assert filter_by_date.status_code == 200
        assert len(filter_by_date.json()["items"]) == 1
        assert filter_by_date.json()["items"][0]["id"] == first_id

        conflict_update = client.put(
            f"/api/notes/{second_id}",
            json={"note_date": "2026-03-08", "title": "会議", "body_markdown": "変更"},
        )
        assert conflict_update.status_code == 409

        update_ok = client.put(
            f"/api/notes/{first_id}",
            json={"note_date": "2026-03-09", "title": "", "body_markdown": ""},
        )
        assert update_ok.status_code == 200
        assert update_ok.json()["id"] == "2026-03-09"
        assert not note_file.exists()
        assert (tmp_path / "admin" / "2026" / "2026-03-09.md").exists()

        delete_ok = client.delete("/api/notes/2026-03-09")
        assert delete_ok.status_code == 204

        missing_after_delete = client.get("/api/notes/2026-03-09")
        assert missing_after_delete.status_code == 404

        remaining = client.get("/api/notes")
        assert remaining.status_code == 200
        assert len(remaining.json()["items"]) == 1


def test_notes_are_isolated_per_user(monkeypatch, tmp_path: Path) -> None:
    _use_temp_notes_root(monkeypatch, tmp_path)

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")
        admin_note = client.post(
            "/api/notes",
            json={"note_date": "2026-03-08", "title": "管理者メモ", "body_markdown": "admin only"},
        )
        assert admin_note.status_code == 201
        admin_note_id = admin_note.json()["id"]
        _logout(client)

        _login(client, "shimizu-yuichiro", "shimizu1234")
        cannot_read_admin_note = client.get(f"/api/notes/{admin_note_id}")
        assert cannot_read_admin_note.status_code == 404
        member_note = client.post(
            "/api/notes",
            json={"note_date": "2026-03-08", "title": "メンバーメモ", "body_markdown": "member only"},
        )
        assert member_note.status_code == 201
        member_note_id = member_note.json()["id"]
        _logout(client)

        _login(client, "admin", "admin1234")
        cannot_read_member_note = client.get(f"/api/notes/{member_note_id}")
        assert cannot_read_member_note.status_code == 404


def _use_temp_notes_root(monkeypatch, tmp_path: Path) -> None:
    class DummySettings:
        notes_root_path = str(tmp_path)

    monkeypatch.setattr(file_notes_service, "get_settings", lambda: DummySettings())


def _login(client: TestClient, user_id: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"user_id": user_id, "password": password})
    assert response.status_code == 200


def _logout(client: TestClient) -> None:
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
