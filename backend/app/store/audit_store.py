from __future__ import annotations

import csv
import io
from datetime import datetime
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.audit_log import AuditLogRecord


def _read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def _sqlite_row_to_record(row: object) -> AuditLogRecord:
    return AuditLogRecord(
        id=row["id"],
        actor_user_id=row["actor_user_id"] or None,
        action=row["action"],
        target_type=row["target_type"],
        target_id=row["target_id"],
        before_json=row["before_json"] or None,
        after_json=row["after_json"] or None,
        reason=row["reason"] or None,
        created_at=datetime.fromisoformat(row["created_at"]),
    )


class AuditStore:
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._sqlite = sqlite_db
        self._legacy_dir = root / "audit_logs"

    def migrate_from_csv_if_empty(self) -> None:
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
        if count > 0 or not self._legacy_dir.exists():
            return
        for path in sorted(self._legacy_dir.glob("*.csv")):
            for row in _read_csv(path):
                try:
                    record = AuditLogRecord(
                        id=row["id"],
                        actor_user_id=row["actor_user_id"] or None,
                        action=row["action"],
                        target_type=row["target_type"],
                        target_id=row["target_id"],
                        before_json=row["before_json"] or None,
                        after_json=row["after_json"] or None,
                        reason=row["reason"] or None,
                        created_at=datetime.fromisoformat(row["created_at"]),
                    )
                except (KeyError, ValueError):
                    continue
                self._sqlite.execute_and_commit(
                    """
                    INSERT OR IGNORE INTO audit_logs
                        (id, actor_user_id, action, target_type, target_id, before_json, after_json, reason, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record.id,
                        record.actor_user_id,
                        record.action,
                        record.target_type,
                        record.target_id,
                        record.before_json,
                        record.after_json,
                        record.reason,
                        record.created_at.isoformat(),
                    ),
                )

    def list_recent(self, *, limit: int = 200) -> list[AuditLogRecord]:
        if self._sqlite is None:
            return []
        rows = self._sqlite.execute(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [_sqlite_row_to_record(row) for row in rows]

    def delete_by_user(self, user_id: str) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            DELETE FROM audit_logs
            WHERE actor_user_id = ?
               OR (target_type = 'users' AND target_id = ?)
            """,
            (user_id, user_id),
        )

    def append(self, record: AuditLogRecord) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            INSERT OR IGNORE INTO audit_logs
                (id, actor_user_id, action, target_type, target_id, before_json, after_json, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.id,
                record.actor_user_id,
                record.action,
                record.target_type,
                record.target_id,
                record.before_json,
                record.after_json,
                record.reason,
                record.created_at.isoformat(),
            ),
        )
