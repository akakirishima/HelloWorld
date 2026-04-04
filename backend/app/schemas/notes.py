from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class NoteItem(BaseModel):
    id: str
    note_date: date
    title: str
    body_markdown: str
    created_at: datetime
    updated_at: datetime


class NoteDetail(NoteItem):
    pass


class NotesListResponse(BaseModel):
    items: list[NoteItem]


class CreateNoteRequest(BaseModel):
    note_date: date
    title: str = ""
    body_markdown: str = ""


class UpdateNoteRequest(BaseModel):
    note_date: date
    title: str = ""
    body_markdown: str = ""


class GoogleNotesStatusResponse(BaseModel):
    connected: bool
    spreadsheet_configured: bool
    spreadsheet_id: str | None
    sheet_name: str | None
    is_binding_active: bool


class GoogleConnectStartResponse(BaseModel):
    auth_url: str
