from __future__ import annotations

import csv
import io
from datetime import datetime
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.audit_log import AuditLogRecord
from app.store.base_store import BaseStore

_FIELDS = ["id", "actor_user_id", "action", "target_type", "target_id", "before_json", "after_json", "reason", "created_at"]


def _record_to_row(r: AuditLogRecord) -> dict:
    return {
        "id": r.id,
        "actor_user_id": r.actor_user_id or "",
        "action": r.action,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "before_json": r.before_json or "",
        "after_json": r.after_json or "",
        "reason": r.reason or "",
        "created_at": r.created_at.isoformat(),
    }


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


class AuditStore(BaseStore):
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        super().__init__(root)
        self._dir = root / "audit_logs"
        self._sqlite = sqlite_db

    def _month_file(self, dt: datetime) -> Path:
        return self._dir / f"{dt.strftime('%Y-%m')}.csv"

    def list_recent(self, *, limit: int = 200) -> list[AuditLogRecord]:
        # SQLiteがあれば高速に取得
        if self._sqlite is not None:
            rows = self._sqlite.execute(
                "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [_sqlite_row_to_record(row) for row in rows]
        # フォールバック：NAS CSV
        if not self._dir.exists():
            return []
        files = sorted(self._dir.glob("*.csv"), reverse=True)
        result = []
        for path in files:
            text = path.read_text(encoding="utf-8")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                result.append(AuditLogRecord(
                    id=row["id"],
                    actor_user_id=row["actor_user_id"] or None,
                    action=row["action"],
                    target_type=row["target_type"],
                    target_id=row["target_id"],
                    before_json=row["before_json"] or None,
                    after_json=row["after_json"] or None,
                    reason=row["reason"] or None,
                    created_at=datetime.fromisoformat(row["created_at"]),
                ))
            if len(result) >= limit:
                break
        return result[:limit]

    def delete_by_user(self, user_id: str) -> None:
        def _should_delete(row: dict) -> bool:
            if row.get("actor_user_id") == user_id:
                return True
            if row.get("target_type") == "users" and row.get("target_id") == user_id:
                return True
            return False

        if self._dir.exists():
            for path in sorted(self._dir.glob("*.csv")):
                text = path.read_text(encoding="utf-8")
                rows = list(csv.DictReader(io.StringIO(text)))
                filtered = [r for r in rows if not _should_delete(r)]
                if len(filtered) != len(rows):
                    if filtered:
                        buf = io.StringIO()
                        writer = csv.DictWriter(buf, fieldnames=_FIELDS)
                        writer.writeheader()
                        writer.writerows(filtered)
                        import os, tempfile
                        tmp_fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
                        try:
                            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                                f.write(buf.getvalue())
                            os.replace(tmp_path, path)
                        except Exception:
                            try:
                                os.unlink(tmp_path)
                            except OSError:
                                pass
                            raise
                    else:
                        path.unlink()
        if self._sqlite is not None:
            self._sqlite.execute_and_commit(
                "DELETE FROM audit_logs WHERE actor_user_id = ?", (user_id,)
            )
            self._sqlite.execute_and_commit(
                "DELETE FROM audit_logs WHERE target_type = 'users' AND target_id = ?",
                (user_id,),
            )

    def append(self, record: AuditLogRecord) -> None:
        # SQLiteに先に書く
        if self._sqlite is not None:
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
        # NAS CSVにも書く
        path = self._month_file(record.created_at)
        path.parent.mkdir(parents=True, exist_ok=True)
        write_header = not path.exists()
        with open(path, "a", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=_FIELDS)
            if write_header:
                writer.writeheader()
            writer.writerow(_record_to_row(record))
