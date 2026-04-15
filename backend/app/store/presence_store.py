from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.presence_latest import PresenceRecord


def _row_to_record(row: object) -> PresenceRecord:
    return PresenceRecord(
        user_id=row["user_id"],
        current_status=row["current_status"],
        current_session_id=row["current_session_id"],
        last_changed_at=datetime.fromisoformat(row["last_changed_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class PresenceStore:
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._sqlite = sqlite_db
        self._legacy_file = root / "presence.json"

    def migrate_from_json_if_empty(self) -> None:
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM presence").fetchone()[0]
        if count > 0:
            return
        data = self._legacy_file
        if not data.exists():
            return
        import json

        try:
            payload = json.loads(data.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        if not isinstance(payload, dict):
            return
        for item in payload.values():
            try:
                record = PresenceRecord.model_validate(item)
            except Exception:
                continue
            self._sqlite.execute_and_commit(
                """
                INSERT OR REPLACE INTO presence
                    (user_id, current_status, current_session_id, last_changed_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    record.user_id,
                    record.current_status,
                    record.current_session_id,
                    record.last_changed_at.isoformat(),
                    record.updated_at.isoformat(),
                ),
            )

    def get(self, user_id: str) -> PresenceRecord | None:
        if self._sqlite is None:
            return None
        row = self._sqlite.execute("SELECT * FROM presence WHERE user_id = ?", (user_id,)).fetchone()
        return _row_to_record(row) if row is not None else None

    def list_all(self) -> list[PresenceRecord]:
        if self._sqlite is None:
            return []
        rows = self._sqlite.execute("SELECT * FROM presence ORDER BY user_id").fetchall()
        return [_row_to_record(row) for row in rows]

    def save(self, presence: PresenceRecord) -> PresenceRecord:
        if self._sqlite is None:
            return presence.model_copy(update={"updated_at": datetime.now(timezone.utc)})

        now = datetime.now(timezone.utc)
        updated = presence.model_copy(update={"updated_at": now})
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO presence
                (user_id, current_status, current_session_id, last_changed_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                updated.user_id,
                updated.current_status,
                updated.current_session_id,
                updated.last_changed_at.isoformat(),
                updated.updated_at.isoformat(),
            ),
        )
        return updated

    def delete(self, user_id: str) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit("DELETE FROM presence WHERE user_id = ?", (user_id,))

    def ensure(self, user_id: str) -> PresenceRecord:
        existing = self.get(user_id)
        if existing is not None:
            return existing
        now = datetime.now(timezone.utc)
        record = PresenceRecord(
            user_id=user_id,
            current_status="Off Campus",
            current_session_id=None,
            last_changed_at=now,
            updated_at=now,
        )
        return self.save(record)
