from __future__ import annotations

import csv
import io
import os
import tempfile
from datetime import datetime
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.status_change import StatusChangeRecord
from app.store.base_store import BaseStore

_FIELDS = ["id", "user_id", "session_id", "from_status", "to_status", "changed_at", "changed_by", "source"]


def _record_to_row(r: StatusChangeRecord) -> dict:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "session_id": r.session_id or "",
        "from_status": r.from_status,
        "to_status": r.to_status,
        "changed_at": r.changed_at.isoformat(),
        "changed_by": r.changed_by or "",
        "source": r.source,
    }


def _read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def _write_csv(path: Path, rows: list[dict]) -> None:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_FIELDS)
    writer.writeheader()
    writer.writerows(rows)
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


class StatusChangeStore(BaseStore):
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        super().__init__(root)
        self._dir = root / "status_changes"
        self._sqlite = sqlite_db

    def _month_file(self, dt: datetime) -> Path:
        return self._dir / f"{dt.strftime('%Y-%m')}.csv"

    def append(self, record: StatusChangeRecord) -> None:
        # SQLiteに先に書く
        if self._sqlite is not None:
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
        # NAS CSVにも書く
        path = self._month_file(record.changed_at)
        path.parent.mkdir(parents=True, exist_ok=True)
        write_header = not path.exists()
        with open(path, "a", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=_FIELDS)
            if write_header:
                writer.writeheader()
            writer.writerow(_record_to_row(record))

    def delete_by_user(self, user_id: str) -> None:
        # NAS CSV: 全月ファイルを走査して user_id の行を削除
        if self._dir.exists():
            for path in sorted(self._dir.glob("*.csv")):
                rows = _read_csv(path)
                filtered = [r for r in rows if r.get("user_id") != user_id]
                if len(filtered) != len(rows):
                    if filtered:
                        _write_csv(path, filtered)
                    else:
                        path.unlink()
        # SQLite
        if self._sqlite is not None:
            self._sqlite.execute_and_commit(
                "DELETE FROM status_changes WHERE user_id = ?", (user_id,)
            )
