from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.session import SessionRecord


def _row_to_record(row: object) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        user_id=row["user_id"],
        check_in_at=datetime.fromisoformat(row["check_in_at"]),
        check_out_at=datetime.fromisoformat(row["check_out_at"]) if row["check_out_at"] else None,
        duration_sec=row["duration_sec"],
        close_reason=row["close_reason"] or None,
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class SessionStore:
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._sqlite = sqlite_db
        self._legacy_dir = root / "sessions"

    def migrate_from_csv_if_empty(self) -> None:
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        if count > 0:
            return
        if not self._legacy_dir.exists():
            return

        for path in sorted(self._legacy_dir.glob("*.csv")):
            text = path.read_text(encoding="utf-8")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                try:
                    record = SessionRecord(
                        id=row["id"],
                        user_id=row["user_id"],
                        check_in_at=datetime.fromisoformat(row["check_in_at"]),
                        check_out_at=datetime.fromisoformat(row["check_out_at"]) if row["check_out_at"] else None,
                        duration_sec=int(row["duration_sec"]) if row["duration_sec"] else None,
                        close_reason=row["close_reason"] or None,
                        created_at=datetime.fromisoformat(row["created_at"]),
                        updated_at=datetime.fromisoformat(row["updated_at"]),
                    )
                except (KeyError, ValueError):
                    continue
                self._sqlite.execute_and_commit(
                    """
                    INSERT OR REPLACE INTO sessions
                        (id, user_id, check_in_at, check_out_at, duration_sec, close_reason, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record.id,
                        record.user_id,
                        record.check_in_at.isoformat(),
                        record.check_out_at.isoformat() if record.check_out_at else None,
                        record.duration_sec,
                        record.close_reason,
                        record.created_at.isoformat(),
                        record.updated_at.isoformat(),
                    ),
                )

    def _sqlite_insert(self, session: SessionRecord) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO sessions
                (id, user_id, check_in_at, check_out_at, duration_sec, close_reason, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.id,
                session.user_id,
                session.check_in_at.isoformat(),
                session.check_out_at.isoformat() if session.check_out_at else None,
                session.duration_sec,
                session.close_reason,
                session.created_at.isoformat(),
                session.updated_at.isoformat(),
            ),
        )

    def add(self, session: SessionRecord) -> SessionRecord:
        now = datetime.now(timezone.utc)
        updated = session.model_copy(update={"updated_at": now})
        self._sqlite_insert(updated)
        return updated

    def get_by_id(self, session_id: str) -> SessionRecord | None:
        if self._sqlite is None:
            return None
        row = self._sqlite.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _row_to_record(row) if row is not None else None

    def get_today_first_check_in(self, user_id: str, today_date: str) -> SessionRecord | None:
        if self._sqlite is None:
            return None
        row = self._sqlite.execute(
            """
            SELECT * FROM sessions
            WHERE user_id = ? AND date(check_in_at) = ?
            ORDER BY check_in_at ASC
            LIMIT 1
            """,
            (user_id, today_date),
        ).fetchone()
        return _row_to_record(row) if row is not None else None

    def list_by_user(self, user_id: str) -> list[SessionRecord]:
        if self._sqlite is None:
            return []
        rows = self._sqlite.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY check_in_at DESC",
            (user_id,),
        ).fetchall()
        return [_row_to_record(row) for row in rows]

    def list_all(self) -> list[SessionRecord]:
        if self._sqlite is None:
            return []
        rows = self._sqlite.execute(
            "SELECT * FROM sessions ORDER BY check_in_at DESC"
        ).fetchall()
        return [_row_to_record(row) for row in rows]

    def get_open_session(self, user_id: str) -> SessionRecord | None:
        if self._sqlite is None:
            return None
        row = self._sqlite.execute(
            """
            SELECT * FROM sessions
            WHERE user_id = ? AND check_out_at IS NULL
            ORDER BY check_in_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        return _row_to_record(row) if row is not None else None

    def delete_by_user(self, user_id: str) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit("DELETE FROM sessions WHERE user_id = ?", (user_id,))

    def update(self, session: SessionRecord) -> SessionRecord:
        now = datetime.now(timezone.utc)
        updated = session.model_copy(update={"updated_at": now})
        self._sqlite_insert(updated)
        return updated
