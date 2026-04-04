from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.note_sheet_binding import NoteSheetBinding
from app.models.user import User
from app.models.user_google_token import UserGoogleToken

SHEET_HEADERS = ["note_id", "note_date", "title", "body_markdown", "created_at", "updated_at"]
TOKEN_URI = "https://oauth2.googleapis.com/token"
AUTH_URI = "https://accounts.google.com/o/oauth2/auth"


@dataclass
class NoteRecord:
    id: str
    note_date: date
    title: str
    body_markdown: str
    created_at: datetime
    updated_at: datetime


@dataclass
class NoteRow:
    record: NoteRecord
    row_index: int


def create_google_oauth_flow(state: str | None = None) -> Flow:
    settings = get_settings()
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured.")

    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "auth_uri": AUTH_URI,
                "token_uri": TOKEN_URI,
            }
        },
        scopes=settings.google_oauth_scopes,
        state=state,
    )
    flow.redirect_uri = settings.google_oauth_redirect_uri
    return flow


class GoogleSheetsNotesStore:
    def __init__(self, db: Session, user: User) -> None:
        self.db = db
        self.user = user

    def get_google_status(self) -> dict[str, Any]:
        token = self._get_google_token()
        binding = self._get_note_binding()
        has_binding = binding is not None and bool(binding.spreadsheet_id) and binding.is_active
        return {
            "connected": token is not None,
            "spreadsheet_configured": has_binding,
            "spreadsheet_id": binding.spreadsheet_id if binding else None,
            "sheet_name": binding.sheet_name if binding else None,
            "is_binding_active": bool(binding.is_active) if binding else False,
        }

    def list_notes(self, *, q: str | None, date_from: date | None, date_to: date | None) -> list[NoteRecord]:
        rows = self._read_rows()
        items = [row.record for row in rows]
        if q:
            keyword = q.lower()
            items = [item for item in items if keyword in item.title.lower() or keyword in item.body_markdown.lower()]
        if date_from:
            items = [item for item in items if item.note_date >= date_from]
        if date_to:
            items = [item for item in items if item.note_date <= date_to]

        return sorted(items, key=lambda item: (item.note_date, item.updated_at), reverse=True)

    def get_note(self, note_id: str) -> NoteRecord | None:
        rows = self._read_rows()
        for row in rows:
            if row.record.id == note_id:
                return row.record
        return None

    def create_note(self, *, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        rows = self._read_rows()
        if any(row.record.note_date == note_date for row in rows):
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
        service, binding = self._authorized_sheet_service()
        try:
            service.spreadsheets().values().append(
                spreadsheetId=binding.spreadsheet_id,
                range=f"{binding.sheet_name}!A:F",
                valueInputOption="RAW",
                body={"values": [[self._record_to_row(record)[key] for key in SHEET_HEADERS]]},
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc
        return record

    def update_note(self, *, note_id: str, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        rows = self._read_rows()
        target = next((row for row in rows if row.record.id == note_id), None)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        if any(row.record.note_date == note_date and row.record.id != note_id for row in rows):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note for this date already exists.")

        updated = NoteRecord(
            id=target.record.id,
            note_date=note_date,
            title=title,
            body_markdown=body_markdown,
            created_at=target.record.created_at,
            updated_at=datetime.now(timezone.utc),
        )
        payload = self._record_to_row(updated)
        service, binding = self._authorized_sheet_service()
        try:
            service.spreadsheets().values().update(
                spreadsheetId=binding.spreadsheet_id,
                range=f"{binding.sheet_name}!A{target.row_index}:F{target.row_index}",
                valueInputOption="RAW",
                body={"values": [[payload[key] for key in SHEET_HEADERS]]},
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc
        return updated

    def delete_note(self, *, note_id: str) -> None:
        rows = self._read_rows()
        target = next((row for row in rows if row.record.id == note_id), None)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        service, binding = self._authorized_sheet_service()
        sheet_id = self._sheet_id(
            service=service,
            spreadsheet_id=binding.spreadsheet_id,
            sheet_name=binding.sheet_name,
        )
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=binding.spreadsheet_id,
                body={
                    "requests": [
                        {
                            "deleteDimension": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "dimension": "ROWS",
                                    "startIndex": target.row_index - 1,
                                    "endIndex": target.row_index,
                                }
                            }
                        }
                    ]
                },
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc

    def _read_rows(self) -> list[NoteRow]:
        service, binding = self._authorized_sheet_service()
        self._ensure_headers(service=service, binding=binding)
        try:
            response = service.spreadsheets().values().get(
                spreadsheetId=binding.spreadsheet_id,
                range=f"{binding.sheet_name}!A2:F",
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc
        values = response.get("values", [])
        rows: list[NoteRow] = []
        for idx, row in enumerate(values, start=2):
            if not row or len(row) < 2:
                continue
            padded = row + [""] * max(0, len(SHEET_HEADERS) - len(row))
            parsed = self._parse_row(padded)
            if parsed is None:
                continue
            rows.append(NoteRow(record=parsed, row_index=idx))
        return rows

    def _ensure_headers(self, *, service: Any, binding: NoteSheetBinding) -> None:
        try:
            header = service.spreadsheets().values().get(
                spreadsheetId=binding.spreadsheet_id,
                range=f"{binding.sheet_name}!1:1",
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc
        values = header.get("values", [])
        current = values[0] if values else []
        if current == SHEET_HEADERS:
            return
        try:
            service.spreadsheets().values().update(
                spreadsheetId=binding.spreadsheet_id,
                range=f"{binding.sheet_name}!A1:F1",
                valueInputOption="RAW",
                body={"values": [SHEET_HEADERS]},
            ).execute()
        except HttpError as exc:
            raise self._from_google_error(exc) from exc

    def _authorized_sheet_service(self) -> tuple[Any, NoteSheetBinding]:
        token = self._get_google_token()
        if token is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Google OAuth connection required.")
        binding = self._get_note_binding()
        if binding is None or not binding.is_active or not binding.spreadsheet_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Spreadsheet binding is not configured.")

        credentials = Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri=TOKEN_URI,
            client_id=get_settings().google_oauth_client_id,
            client_secret=get_settings().google_oauth_client_secret,
            scopes=get_settings().google_oauth_scopes,
            expiry=token.expiry_at,
        )
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(GoogleRequest())
                token.access_token = credentials.token
                if credentials.refresh_token:
                    token.refresh_token = credentials.refresh_token
                token.expiry_at = credentials.expiry
                self.db.commit()
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Google OAuth token is invalid. Reconnect required.",
                )
        service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        return service, binding

    def _sheet_id(self, *, service: Any, spreadsheet_id: str, sheet_name: str) -> int:
        try:
            metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
            sheets = metadata.get("sheets", [])
            for sheet in sheets:
                props = sheet.get("properties", {})
                if props.get("title") == sheet_name:
                    return int(props.get("sheetId"))
        except HttpError as exc:
            raise self._from_google_error(exc) from exc
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Configured sheet_name was not found.")

    def _parse_row(self, row: list[str]) -> NoteRecord | None:
        try:
            note_date = date.fromisoformat(row[1])
        except ValueError:
            return None
        created_at = parse_datetime_or_now(row[4])
        updated_at = parse_datetime_or_now(row[5])
        if not row[0]:
            return None
        return NoteRecord(
            id=row[0],
            note_date=note_date,
            title=row[2],
            body_markdown=row[3],
            created_at=created_at,
            updated_at=updated_at,
        )

    def _record_to_row(self, record: NoteRecord) -> dict[str, str]:
        return {
            "note_id": record.id,
            "note_date": record.note_date.isoformat(),
            "title": record.title,
            "body_markdown": record.body_markdown,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }

    def _get_google_token(self) -> UserGoogleToken | None:
        return self.db.query(UserGoogleToken).filter(UserGoogleToken.user_id == self.user.id).one_or_none()

    def _get_note_binding(self) -> NoteSheetBinding | None:
        return self.db.query(NoteSheetBinding).filter(NoteSheetBinding.user_id == self.user.id).one_or_none()

    def _from_google_error(self, exc: HttpError) -> HTTPException:
        status_code = exc.resp.status if exc.resp is not None else 502
        if status_code in (401, 403):
            return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Google Sheets access denied.")
        if status_code == 404:
            return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Spreadsheet not found.")
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google Sheets request failed.")


def store_google_tokens(db: Session, user: User, *, flow_credentials: Credentials) -> UserGoogleToken:
    token = db.query(UserGoogleToken).filter(UserGoogleToken.user_id == user.id).one_or_none()
    if token is None:
        token = UserGoogleToken(
            user_id=user.id,
            google_subject=extract_google_subject(flow_credentials.id_token) or user.user_id,
            access_token=flow_credentials.token,
            refresh_token=flow_credentials.refresh_token,
            expiry_at=flow_credentials.expiry,
        )
        db.add(token)
    else:
        token.google_subject = extract_google_subject(flow_credentials.id_token) or token.google_subject
        token.access_token = flow_credentials.token
        if flow_credentials.refresh_token:
            token.refresh_token = flow_credentials.refresh_token
        token.expiry_at = flow_credentials.expiry
    db.commit()
    db.refresh(token)
    return token


def disconnect_google_tokens(db: Session, user: User) -> None:
    token = db.query(UserGoogleToken).filter(UserGoogleToken.user_id == user.id).one_or_none()
    if token is None:
        return
    db.delete(token)
    db.commit()


def parse_datetime_or_now(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def extract_google_subject(id_token: str | None) -> str | None:
    if not id_token:
        return None
    parts = id_token.split(".")
    if len(parts) < 2:
        return None
    payload = parts[1]
    padded = payload + "=" * ((4 - len(payload) % 4) % 4)
    try:
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError):
        return None
    marker = '"sub":"'
    start = decoded.find(marker)
    if start < 0:
        return None
    start += len(marker)
    end = decoded.find('"', start)
    if end < 0:
        return None
    subject = decoded[start:end].strip()
    return subject or None
