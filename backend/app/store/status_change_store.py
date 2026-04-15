from __future__ import annotations

import csv
import io
from datetime import datetime
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.status_change import StatusChangeRecord


def _read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    return list(csv.DictReader(io.StringIO(text)))


class StatusChangeStore:
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._sqlite = sqlite_db
        self._legacy_dir = root / "status_changes"

    def migrate_from_csv_if_empty(self) -> None:
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM status_changes").fetchone()[0]
        if count > 0 or not self._legacy_dir.exists():
            return
        for path in sorted(self._legacy_dir.glob("*.csv")):
            for row in _read_csv(path):
                try:
                    record = StatusChangeRecord(
                        id=row["id"],
                        user_id=row["user_id"],
                        session_id=row["session_id"] or None,
                        from_status=row["from_status"],
                        to_status=row["to_status"],
                        changed_at=datetime.fromisoformat(row["changed_at"]),
                        changed_by=row["changed_by"] or None,
                        source=row.get("source") or "web",
                    )
                except (KeyError, ValueError):
                    continue
                self._sqlite.execute_and_commit(
                    """
                    INSERT OR IGNORE INTO status_changes
                        (id, user_id, session_id, from_status, to_status, changed_at, changed_by, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record.id,
                        record.user_id,
                        record.session_id,
                        record.from_status,
                        record.to_status,
                        record.changed_at.isoformat(),
                        record.changed_by,
                        record.source,
                    ),
                )

    def append(self, record: StatusChangeRecord) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            INSERT OR IGNORE INTO status_changes
                (id, user_id, session_id, from_status, to_status, changed_at, changed_by, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.id,
                record.user_id,
                record.session_id,
                record.from_status,
                record.to_status,
                record.changed_at.isoformat(),
                record.changed_by,
                record.source,
            ),
        )

    def delete_by_user(self, user_id: str) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            "DELETE FROM status_changes WHERE user_id = ?",
            (user_id,),
        )
