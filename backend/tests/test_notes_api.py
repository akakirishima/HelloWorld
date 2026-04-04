from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.routes import notes as notes_routes
from app.main import app
from app.services.google_notes_service import NoteRecord


class FakeGoogleSheetsNotesStore:
    status_by_user: dict[str, dict[str, object]] = {}
    notes_by_user: dict[str, list[NoteRecord]] = {}

    def __init__(self, db, user) -> None:
        self.user_id = user.user_id

    @classmethod
    def reset(cls) -> None:
        cls.status_by_user = {}
        cls.notes_by_user = {}

    @classmethod
    def set_status(
        cls,
        user_id: str,
        *,
        connected: bool,
        spreadsheet_configured: bool,
        spreadsheet_id: str | None = None,
        sheet_name: str | None = "notes",
        is_binding_active: bool = True,
    ) -> None:
        cls.status_by_user[user_id] = {
            "connected": connected,
            "spreadsheet_configured": spreadsheet_configured,
            "spreadsheet_id": spreadsheet_id,
            "sheet_name": sheet_name,
            "is_binding_active": is_binding_active,
        }

    def get_google_status(self) -> dict[str, object]:
        return self._status()

    def list_notes(self, *, q: str | None, date_from: date | None, date_to: date | None) -> list[NoteRecord]:
        self._assert_ready()
        items = list(self.notes_by_user.get(self.user_id, []))
        if q:
            keyword = q.lower()
            items = [item for item in items if keyword in item.title.lower() or keyword in item.body_markdown.lower()]
        if date_from:
            items = [item for item in items if item.note_date >= date_from]
        if date_to:
            items = [item for item in items if item.note_date <= date_to]
        return sorted(items, key=lambda item: (item.note_date, item.updated_at), reverse=True)

    def get_note(self, note_id: str) -> NoteRecord | None:
        self._assert_ready()
        return next((item for item in self.notes_by_user.get(self.user_id, []) if item.id == note_id), None)

    def create_note(self, *, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        self._assert_ready()
        items = self.notes_by_user.setdefault(self.user_id, [])
        if any(item.note_date == note_date for item in items):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note for this date already exists.")

        now = datetime.now(timezone.utc)
        record = NoteRecord(
            id=str(uuid4()),
            note_date=note_date,
            title=title,
            body_markdown=body_markdown,
            created_at=now,
            updated_at=now,
        )
        items.append(record)
        return record

    def update_note(self, *, note_id: str, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        self._assert_ready()
        items = self.notes_by_user.setdefault(self.user_id, [])
        target = next((item for item in items if item.id == note_id), None)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        if any(item.note_date == note_date and item.id != note_id for item in items):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note for this date already exists.")

        target.note_date = note_date
        target.title = title
        target.body_markdown = body_markdown
        target.updated_at = datetime.now(timezone.utc)
        return target

    def delete_note(self, *, note_id: str) -> None:
        self._assert_ready()
        items = self.notes_by_user.setdefault(self.user_id, [])
        next_items = [item for item in items if item.id != note_id]
        if len(next_items) == len(items):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        self.notes_by_user[self.user_id] = next_items

    def _status(self) -> dict[str, object]:
        return self.status_by_user.get(
            self.user_id,
            {
                "connected": False,
                "spreadsheet_configured": False,
                "spreadsheet_id": None,
                "sheet_name": None,
                "is_binding_active": False,
            },
        )

    def _assert_ready(self) -> None:
        status_payload = self._status()
        if not status_payload["connected"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Google OAuth connection required.")
        if not status_payload["spreadsheet_configured"] or not status_payload["is_binding_active"]:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Spreadsheet binding is not configured.")


def test_notes_require_google_connection_and_sheet_binding(monkeypatch) -> None:
    _use_fake_notes_store(monkeypatch)

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")

        no_oauth = client.get("/api/notes")
        assert no_oauth.status_code == 403

        FakeGoogleSheetsNotesStore.set_status(
            "admin",
            connected=True,
            spreadsheet_configured=False,
            is_binding_active=False,
        )
        no_binding = client.get("/api/notes")
        assert no_binding.status_code == 409

        FakeGoogleSheetsNotesStore.set_status(
            "admin",
            connected=True,
            spreadsheet_configured=True,
            spreadsheet_id="sheet-admin",
            sheet_name="notes",
            is_binding_active=True,
        )
        status_ok = client.get("/api/notes/google/status")
        assert status_ok.status_code == 200
        assert status_ok.json()["connected"] is True
        assert status_ok.json()["spreadsheet_configured"] is True

        list_ok = client.get("/api/notes")
        assert list_ok.status_code == 200
        assert list_ok.json()["items"] == []


def test_notes_crud_filters_and_single_note_per_day(monkeypatch) -> None:
    _use_fake_notes_store(monkeypatch)
    FakeGoogleSheetsNotesStore.set_status(
        "admin",
        connected=True,
        spreadsheet_configured=True,
        spreadsheet_id="sheet-admin",
        sheet_name="notes",
        is_binding_active=True,
    )

    with TestClient(app) as client:
        _login(client, "admin", "admin1234")

        first_create = client.post(
            "/api/notes",
            json={"note_date": "2026-03-08", "title": "論文準備", "body_markdown": "実験計画を更新"},
        )
        assert first_create.status_code == 201
        first_id = first_create.json()["id"]

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
            json={"note_date": "2026-03-08", "title": "", "body_markdown": ""},
        )
        assert update_ok.status_code == 200
        assert update_ok.json()["title"] == ""
        assert update_ok.json()["body_markdown"] == ""

        delete_ok = client.delete(f"/api/notes/{first_id}")
        assert delete_ok.status_code == 204

        missing_after_delete = client.get(f"/api/notes/{first_id}")
        assert missing_after_delete.status_code == 404

        remaining = client.get("/api/notes")
        assert remaining.status_code == 200
        assert len(remaining.json()["items"]) == 1


def test_notes_are_isolated_per_user(monkeypatch) -> None:
    _use_fake_notes_store(monkeypatch)
    FakeGoogleSheetsNotesStore.set_status(
        "admin",
        connected=True,
        spreadsheet_configured=True,
        spreadsheet_id="sheet-admin",
        sheet_name="notes",
        is_binding_active=True,
    )
    FakeGoogleSheetsNotesStore.set_status(
        "shimizu-yuichiro",
        connected=True,
        spreadsheet_configured=True,
        spreadsheet_id="sheet-shimizu",
        sheet_name="notes",
        is_binding_active=True,
    )

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


def _use_fake_notes_store(monkeypatch) -> None:
    FakeGoogleSheetsNotesStore.reset()
    monkeypatch.setattr(notes_routes, "GoogleSheetsNotesStore", FakeGoogleSheetsNotesStore)


def _login(client: TestClient, user_id: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"user_id": user_id, "password": password})
    assert response.status_code == 200


def _logout(client: TestClient) -> None:
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
