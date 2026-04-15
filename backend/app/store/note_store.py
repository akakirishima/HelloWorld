from __future__ import annotations

import json
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, status

from app.db.sqlite_db import SqliteDb
from app.models.note import NoteRecord


def _row_to_record(row: object) -> NoteRecord:
    return NoteRecord(
        id=row["note_date"],
        user_id=row["user_id"],
        note_date=date.fromisoformat(row["note_date"]),
        title=row["title"] or "",
        did_today=row["did_today"] or "",
        future_tasks=row["future_tasks"] or "",
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class NoteStore:
    def __init__(self, root: Path, user_id: str, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self.user_id = user_id
        self._sqlite = sqlite_db
        self._legacy_dir = root / "notes" / user_id

    def migrate_from_legacy_if_empty(self) -> None:
        if self._sqlite is None:
            return
        count = self._sqlite.execute(
            "SELECT COUNT(*) FROM notes WHERE user_id = ?",
            (self.user_id,),
        ).fetchone()[0]
        if count > 0 or not self._legacy_dir.exists():
            return
        for path in sorted(self._legacy_dir.glob("*/*.md")):
            record = self._parse_legacy_note_file(path)
            if record is not None:
                self._sqlite_upsert(record)

    def list_notes(
        self,
        *,
        q: str | None,
        date_from: date | None,
        date_to: date | None,
    ) -> list[NoteRecord]:
        if self._sqlite is None:
            return []
        rows = self._sqlite.execute(
            """
            SELECT * FROM notes
            WHERE user_id = ?
            ORDER BY note_date DESC, updated_at DESC
            """,
            (self.user_id,),
        ).fetchall()
        notes = [_row_to_record(row) for row in rows]
        if q:
            keyword = q.lower()
            notes = [
                item for item in notes
                if keyword in item.title.lower()
                or keyword in item.did_today.lower()
                or keyword in item.future_tasks.lower()
            ]
        if date_from:
            notes = [item for item in notes if item.note_date >= date_from]
        if date_to:
            notes = [item for item in notes if item.note_date <= date_to]
        return sorted(notes, key=lambda item: (item.note_date, item.updated_at), reverse=True)

    def get_note(self, note_id: str) -> NoteRecord | None:
        note_date = self._parse_note_id(note_id)
        if note_date is None or self._sqlite is None:
            return None
        row = self._sqlite.execute(
            "SELECT * FROM notes WHERE user_id = ? AND note_date = ?",
            (self.user_id, note_date.isoformat()),
        ).fetchone()
        return _row_to_record(row) if row is not None else None

    def create_note(
        self,
        *,
        note_date: date,
        title: str,
        did_today: str,
        future_tasks: str,
    ) -> NoteRecord:
        self._ensure_editable(note_date)
        if self._sqlite is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SQLite is not available.",
            )
        existing = self._sqlite.execute(
            "SELECT 1 FROM notes WHERE user_id = ? AND note_date = ?",
            (self.user_id, note_date.isoformat()),
        ).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A note for this date already exists.",
            )

        now = datetime.now(timezone.utc)
        record = NoteRecord(
            id=note_date.isoformat(),
            user_id=self.user_id,
            note_date=note_date,
            title=title,
            did_today=did_today,
            future_tasks=future_tasks,
            created_at=now,
            updated_at=now,
        )
        self._sqlite_upsert(record)
        return record

    def update_note(
        self,
        *,
        note_id: str,
        note_date: date,
        title: str,
        did_today: str,
        future_tasks: str,
    ) -> NoteRecord:
        current = self._require_note(note_id)
        self._ensure_editable(current.note_date)
        self._ensure_editable(note_date)

        if note_date != current.note_date:
            existing = self._sqlite.execute(
                "SELECT 1 FROM notes WHERE user_id = ? AND note_date = ?",
                (self.user_id, note_date.isoformat()),
            ).fetchone()
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A note for this date already exists.",
                )

        updated = NoteRecord(
            id=note_date.isoformat(),
            user_id=self.user_id,
            note_date=note_date,
            title=title,
            did_today=did_today,
            future_tasks=future_tasks,
            created_at=current.created_at,
            updated_at=datetime.now(timezone.utc),
        )
        if note_date != current.note_date:
            self._sqlite.execute_and_commit(
                "DELETE FROM notes WHERE user_id = ? AND note_date = ?",
                (self.user_id, current.note_date.isoformat()),
            )
        self._sqlite_upsert(updated)
        return updated

    def delete_note(self, *, note_id: str) -> None:
        note = self._require_note(note_id)
        self._ensure_editable(note.note_date)
        self._sqlite.execute_and_commit(
            "DELETE FROM notes WHERE user_id = ? AND note_date = ?",
            (self.user_id, note.note_date.isoformat()),
        )

    def delete_by_user(self, user_id: str) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit("DELETE FROM notes WHERE user_id = ?", (user_id,))
        legacy_user_dir = self.root / "notes" / user_id
        if legacy_user_dir.exists():
            shutil.rmtree(legacy_user_dir)

    def _sqlite_upsert(self, note: NoteRecord) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO notes
                (id, user_id, note_date, title, did_today, future_tasks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                self._db_id(note.note_date),
                note.user_id,
                note.note_date.isoformat(),
                note.title,
                note.did_today,
                note.future_tasks,
                note.created_at.isoformat(),
                note.updated_at.isoformat(),
            ),
        )

    def _require_note(self, note_id: str) -> NoteRecord:
        note = self.get_note(note_id)
        if note is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        return note

    def _ensure_editable(self, note_date: date) -> None:
        # 直近2週間のみ編集可。古い日誌は閲覧・出力はできるが編集は止める。
        cutoff = datetime.now(timezone.utc).date() - timedelta(days=13)
        if note_date < cutoff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Notes older than 14 days cannot be edited.",
            )

    def _parse_note_id(self, note_id: str) -> date | None:
        try:
            return date.fromisoformat(note_id)
        except ValueError:
            return None

    def _db_id(self, note_date: date) -> str:
        return f"{self.user_id}:{note_date.isoformat()}"

    def _parse_legacy_note_file(self, note_path: Path) -> NoteRecord | None:
        if not note_path.exists():
            return None

        content = note_path.read_text(encoding="utf-8")
        boundary = "---"
        if not content.startswith(f"{boundary}\n"):
            return None

        separator = f"\n{boundary}\n"
        metadata_start = len(boundary) + 1
        metadata_end = content.find(separator, metadata_start)
        if metadata_end == -1:
            return None

        try:
            metadata = json.loads(content[metadata_start:metadata_end])
            note_date = date.fromisoformat(metadata["note_date"])
            created_at = datetime.fromisoformat(metadata["created_at"])
            updated_at = datetime.fromisoformat(metadata["updated_at"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None

        if metadata.get("user_id") != self.user_id:
            return None

        if "did_today" in metadata:
            did_today = str(metadata.get("did_today") or "")
            future_tasks = str(metadata.get("future_tasks") or "")
        else:
            body = content[metadata_end + len(separator):]
            if body.startswith("\n"):
                body = body[1:]
            did_today = body
            future_tasks = ""

        return NoteRecord(
            id=note_date.isoformat(),
            user_id=self.user_id,
            note_date=note_date,
            title=str(metadata.get("title") or ""),
            did_today=did_today,
            future_tasks=future_tasks,
            created_at=created_at,
            updated_at=updated_at,
        )


def migrate_legacy_notes(root: Path, sqlite_db: SqliteDb | None) -> None:
    if sqlite_db is None:
        return
    legacy_root = root / "notes"
    if not legacy_root.exists():
        return

    for user_dir in sorted(path for path in legacy_root.iterdir() if path.is_dir()):
        store = NoteStore(root=root, user_id=user_dir.name, sqlite_db=sqlite_db)
        store.migrate_from_legacy_if_empty()
