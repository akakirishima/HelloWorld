from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status

FRONT_MATTER_BOUNDARY = "---"


@dataclass
class NoteRecord:
    id: str
    note_date: date
    title: str
    body_markdown: str
    created_at: datetime
    updated_at: datetime


class FileNotesStore:
    def __init__(self, user_id: str, root_path: Path) -> None:
        self.user_id = user_id
        self.root_path = root_path

    def list_notes(self, *, q: str | None, date_from: date | None, date_to: date | None) -> list[NoteRecord]:
        items = [self._parse_note_file(path) for path in self._user_root().glob("*/*.md")]
        notes = [item for item in items if item is not None]
        if q:
            keyword = q.lower()
            notes = [item for item in notes if keyword in item.title.lower() or keyword in item.body_markdown.lower()]
        if date_from:
            notes = [item for item in notes if item.note_date >= date_from]
        if date_to:
            notes = [item for item in notes if item.note_date <= date_to]
        return sorted(notes, key=lambda item: (item.note_date, item.updated_at), reverse=True)

    def get_note(self, note_id: str) -> NoteRecord | None:
        note_path = self._note_path_from_id(note_id)
        if not note_path.exists():
            return None
        return self._parse_note_file(note_path)

    def create_note(self, *, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        note_path = self._note_path(note_date)
        if note_path.exists():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note for this date already exists.")

        now = datetime.now(timezone.utc)
        record = NoteRecord(
            id=note_date.isoformat(),
            note_date=note_date,
            title=title,
            body_markdown=body_markdown,
            created_at=now,
            updated_at=now,
        )
        self._write_note_file(note_path, record)
        return record

    def update_note(self, *, note_id: str, note_date: date, title: str, body_markdown: str) -> NoteRecord:
        current_path = self._note_path_from_id(note_id)
        current = self._require_note(current_path)
        next_path = self._note_path(note_date)
        if next_path != current_path and next_path.exists():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note for this date already exists.")

        updated = NoteRecord(
            id=note_date.isoformat(),
            note_date=note_date,
            title=title,
            body_markdown=body_markdown,
            created_at=current.created_at,
            updated_at=datetime.now(timezone.utc),
        )
        self._write_note_file(next_path, updated)
        if next_path != current_path and current_path.exists():
            current_path.unlink()
            self._cleanup_empty_dirs(current_path.parent)
        return updated

    def delete_note(self, *, note_id: str) -> None:
        note_path = self._note_path_from_id(note_id)
        self._require_note(note_path)
        note_path.unlink()
        self._cleanup_empty_dirs(note_path.parent)

    def delete_all_for_user(self) -> None:
        import shutil
        user_root = self._user_root()
        if user_root.exists():
            shutil.rmtree(user_root)

    def _require_note(self, note_path: Path) -> NoteRecord:
        parsed = self._parse_note_file(note_path)
        if parsed is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        return parsed

    def _write_note_file(self, note_path: Path, record: NoteRecord) -> None:
        note_path.parent.mkdir(parents=True, exist_ok=True)
        metadata = {
            "id": record.id,
            "note_date": record.note_date.isoformat(),
            "user_id": self.user_id,
            "title": record.title,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
        payload = (
            f"{FRONT_MATTER_BOUNDARY}\n"
            f"{json.dumps(metadata, ensure_ascii=False, indent=2)}\n"
            f"{FRONT_MATTER_BOUNDARY}\n\n"
            f"{record.body_markdown}"
        )
        note_path.write_text(payload, encoding="utf-8")

    def _parse_note_file(self, note_path: Path) -> NoteRecord | None:
        if not note_path.exists():
            return None

        content = note_path.read_text(encoding="utf-8")
        if not content.startswith(f"{FRONT_MATTER_BOUNDARY}\n"):
            return None

        separator = f"\n{FRONT_MATTER_BOUNDARY}\n"
        metadata_start = len(FRONT_MATTER_BOUNDARY) + 1
        metadata_end = content.find(separator, metadata_start)
        if metadata_end == -1:
            return None

        try:
            metadata = json.loads(content[metadata_start:metadata_end])
            note_date = date.fromisoformat(metadata["note_date"])
            created_at = _parse_datetime(metadata["created_at"])
            updated_at = _parse_datetime(metadata["updated_at"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None

        if metadata.get("user_id") != self.user_id:
            return None

        body_markdown = content[metadata_end + len(separator):]
        if body_markdown.startswith("\n"):
            body_markdown = body_markdown[1:]

        return NoteRecord(
            id=str(metadata.get("id") or note_date.isoformat()),
            note_date=note_date,
            title=str(metadata.get("title") or ""),
            body_markdown=body_markdown,
            created_at=created_at,
            updated_at=updated_at,
        )

    def _note_path(self, note_date: date) -> Path:
        return self._user_root() / f"{note_date.year}" / f"{note_date.isoformat()}.md"

    def _note_path_from_id(self, note_id: str) -> Path:
        try:
            note_date = date.fromisoformat(note_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.") from exc
        return self._note_path(note_date)

    def _user_root(self) -> Path:
        return self.root_path / self.user_id

    def _cleanup_empty_dirs(self, path: Path) -> None:
        user_root = self._user_root()
        current = path
        while current != user_root and current.exists():
            try:
                current.rmdir()
            except OSError:
                return
            current = current.parent


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed
