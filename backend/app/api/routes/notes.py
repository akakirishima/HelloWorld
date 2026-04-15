from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import ActiveUser, AppStores
from app.core.config import get_settings
from app.models.note import NoteRecord
from app.models.user import UserRecord
from app.schemas.notes import (
    CreateNoteRequest,
    NoteDetail,
    NoteItem,
    NotesListResponse,
    UpdateNoteRequest,
)
from app.services.note_export_service import create_notes_workbook
from app.store.note_store import NoteStore

router = APIRouter(prefix="/notes")


def _notes_store(stores: AppStores, user: UserRecord) -> NoteStore:
    root = Path(get_settings().data_root_path)
    return NoteStore(root=root, user_id=user.user_id, sqlite_db=stores.sqlite_db)


@router.get("", response_model=NotesListResponse)
def list_notes(
    stores: AppStores,
    user: ActiveUser,
    q: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> NotesListResponse:
    store = _notes_store(stores, user)
    notes = store.list_notes(q=q, date_from=date_from, date_to=date_to)
    return NotesListResponse(items=[serialize_note(note) for note in notes])


@router.get("/export")
def export_notes(
    stores: AppStores,
    user: ActiveUser,
    q: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> Response:
    store = _notes_store(stores, user)
    notes = store.list_notes(q=q, date_from=date_from, date_to=date_to)
    content = create_notes_workbook(notes)
    filename = "notes-export.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=NoteDetail, status_code=status.HTTP_201_CREATED)
def create_note(payload: CreateNoteRequest, stores: AppStores, user: ActiveUser) -> NoteDetail:
    store = _notes_store(stores, user)
    note = store.create_note(
        note_date=payload.note_date,
        title=payload.title,
        did_today=payload.did_today,
        future_tasks=payload.future_tasks,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.get("/{note_id}", response_model=NoteDetail)
def get_note(note_id: str, stores: AppStores, user: ActiveUser) -> NoteDetail:
    store = _notes_store(stores, user)
    note = store.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return NoteDetail(**serialize_note(note).model_dump())


@router.put("/{note_id}", response_model=NoteDetail)
def update_note(
    note_id: str,
    payload: UpdateNoteRequest,
    stores: AppStores,
    user: ActiveUser,
) -> NoteDetail:
    store = _notes_store(stores, user)
    note = store.update_note(
        note_id=note_id,
        note_date=payload.note_date,
        title=payload.title,
        did_today=payload.did_today,
        future_tasks=payload.future_tasks,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str, stores: AppStores, user: ActiveUser) -> None:
    store = _notes_store(stores, user)
    store.delete_note(note_id=note_id)


def serialize_note(note: NoteRecord) -> NoteItem:
    return NoteItem(
        id=note.id,
        note_date=note.note_date,
        title=note.title,
        did_today=note.did_today,
        future_tasks=note.future_tasks,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )
