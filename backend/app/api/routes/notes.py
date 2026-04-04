from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActiveUser, DbSession
from app.schemas.notes import (
    CreateNoteRequest,
    NoteDetail,
    NoteItem,
    NotesListResponse,
    UpdateNoteRequest,
)
from app.services.file_notes_service import FileNotesStore, NoteRecord

router = APIRouter(prefix="/notes")


@router.get("", response_model=NotesListResponse)
def list_notes(
    db: DbSession,
    user: ActiveUser,
    q: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> NotesListResponse:
    store = FileNotesStore(db=db, user=user)
    notes = store.list_notes(q=q, date_from=date_from, date_to=date_to)
    return NotesListResponse(items=[serialize_note(note) for note in notes])


@router.post("", response_model=NoteDetail, status_code=status.HTTP_201_CREATED)
def create_note(payload: CreateNoteRequest, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = FileNotesStore(db=db, user=user)
    note = store.create_note(
        note_date=payload.note_date,
        title=payload.title,
        body_markdown=payload.body_markdown,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.get("/{note_id}", response_model=NoteDetail)
def get_note(note_id: str, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = FileNotesStore(db=db, user=user)
    note = store.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return NoteDetail(**serialize_note(note).model_dump())


@router.put("/{note_id}", response_model=NoteDetail)
def update_note(note_id: str, payload: UpdateNoteRequest, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = FileNotesStore(db=db, user=user)
    note = store.update_note(
        note_id=note_id,
        note_date=payload.note_date,
        title=payload.title,
        body_markdown=payload.body_markdown,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str, db: DbSession, user: ActiveUser) -> None:
    store = FileNotesStore(db=db, user=user)
    store.delete_note(note_id=note_id)


def serialize_note(note: NoteRecord) -> NoteItem:
    return NoteItem(
        id=note.id,
        note_date=note.note_date,
        title=note.title,
        body_markdown=note.body_markdown,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )
