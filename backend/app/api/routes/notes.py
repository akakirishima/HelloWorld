from __future__ import annotations

import secrets
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import ActiveUser, DbSession
from app.core.config import get_settings
from app.schemas.notes import (
    CreateNoteRequest,
    GoogleConnectStartResponse,
    GoogleNotesStatusResponse,
    NoteDetail,
    NoteItem,
    NotesListResponse,
    UpdateNoteRequest,
)
from app.services.google_notes_service import (
    GoogleSheetsNotesStore,
    NoteRecord,
    create_google_oauth_flow,
    disconnect_google_tokens,
    store_google_tokens,
)

router = APIRouter(prefix="/notes")


@router.get("", response_model=NotesListResponse)
def list_notes(
    db: DbSession,
    user: ActiveUser,
    q: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> NotesListResponse:
    store = GoogleSheetsNotesStore(db=db, user=user)
    notes = store.list_notes(q=q, date_from=date_from, date_to=date_to)
    return NotesListResponse(items=[serialize_note(note) for note in notes])


@router.post("", response_model=NoteDetail, status_code=status.HTTP_201_CREATED)
def create_note(payload: CreateNoteRequest, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = GoogleSheetsNotesStore(db=db, user=user)
    note = store.create_note(
        note_date=payload.note_date,
        title=payload.title,
        body_markdown=payload.body_markdown,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.get("/google/status", response_model=GoogleNotesStatusResponse)
def google_status(db: DbSession, user: ActiveUser) -> GoogleNotesStatusResponse:
    store = GoogleSheetsNotesStore(db=db, user=user)
    payload = store.get_google_status()
    return GoogleNotesStatusResponse(**payload)


@router.get("/google/connect/start", response_model=GoogleConnectStartResponse)
def google_connect_start(request: Request, user: ActiveUser) -> GoogleConnectStartResponse:
    state = secrets.token_urlsafe(24)
    request.session["notes_google_oauth_state"] = state
    request.session["notes_google_oauth_user_id"] = user.id
    flow = create_google_oauth_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return GoogleConnectStartResponse(auth_url=auth_url)


@router.get("/google/connect/callback")
def google_connect_callback(
    request: Request,
    db: DbSession,
    user: ActiveUser,
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google OAuth error: {error}")
    if state is None or code is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth callback payload.")

    expected_state = request.session.pop("notes_google_oauth_state", None)
    expected_user_id = request.session.pop("notes_google_oauth_user_id", None)
    if expected_state != state or expected_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth state mismatch.")

    flow = create_google_oauth_flow(state=state)
    flow.fetch_token(code=code)
    store_google_tokens(db, user, flow_credentials=flow.credentials)

    return RedirectResponse(url=get_settings().google_oauth_success_redirect, status_code=status.HTTP_302_FOUND)


@router.post("/google/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def google_disconnect(db: DbSession, user: ActiveUser) -> None:
    disconnect_google_tokens(db, user)


@router.get("/{note_id}", response_model=NoteDetail)
def get_note(note_id: str, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = GoogleSheetsNotesStore(db=db, user=user)
    note = store.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return NoteDetail(**serialize_note(note).model_dump())


@router.put("/{note_id}", response_model=NoteDetail)
def update_note(note_id: str, payload: UpdateNoteRequest, db: DbSession, user: ActiveUser) -> NoteDetail:
    store = GoogleSheetsNotesStore(db=db, user=user)
    note = store.update_note(
        note_id=note_id,
        note_date=payload.note_date,
        title=payload.title,
        body_markdown=payload.body_markdown,
    )
    return NoteDetail(**serialize_note(note).model_dump())


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str, db: DbSession, user: ActiveUser) -> None:
    store = GoogleSheetsNotesStore(db=db, user=user)
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
