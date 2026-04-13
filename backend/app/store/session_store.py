from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.session import SessionRecord
from app.store.base_store import BaseStore

_FIELDS = [
    "id", "user_id", "check_in_at", "check_out_at",
    "duration_sec", "close_reason", "created_at", "updated_at",
]


def _record_to_row(r: SessionRecord) -> dict:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "check_in_at": r.check_in_at.isoformat(),
        "check_out_at": r.check_out_at.isoformat() if r.check_out_at else "",
        "duration_sec": "" if r.duration_sec is None else str(r.duration_sec),
        "close_reason": r.close_reason or "",
        "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat(),
    }


def _row_to_record(row: dict) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        user_id=row["user_id"],
        check_in_at=datetime.fromisoformat(row["check_in_at"]),
        check_out_at=datetime.fromisoformat(row["check_out_at"]) if row["check_out_at"] else None,
        duration_sec=int(row["duration_sec"]) if row["duration_sec"] else None,
        close_reason=row["close_reason"] or None,
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def _sqlite_row_to_record(row: object) -> SessionRecord:
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


class SessionStore(BaseStore):
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        super().__init__(root)
        self._dir = root / "sessions"
        self._lock_file = root / ".locks" / "sessions.lock"
        self._sqlite = sqlite_db

    def _month_file(self, dt: datetime) -> Path:
        return self._dir / f"{dt.strftime('%Y-%m')}.csv"

    def _read_file(self, path: Path) -> list[SessionRecord]:
        if not path.exists():
            return []
        text = path.read_text(encoding="utf-8")
        reader = csv.DictReader(io.StringIO(text))
        return [_row_to_record(row) for row in reader]

    def _write_file(self, path: Path, records: list[SessionRecord]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=_FIELDS)
        writer.writeheader()
        for r in records:
            writer.writerow(_record_to_row(r))
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

    def _all_files(self) -> list[Path]:
        if not self._dir.exists():
            return []
        return sorted(self._dir.glob("*.csv"), reverse=True)

    def _sqlite_insert(self, r: SessionRecord) -> None:
        if self._sqlite is None:
            return
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO sessions
                (id, user_id, check_in_at, check_out_at, duration_sec, close_reason, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r.id,
                r.user_id,
                r.check_in_at.isoformat(),
                r.check_out_at.isoformat() if r.check_out_at else None,
                r.duration_sec,
                r.close_reason,
                r.created_at.isoformat(),
                r.updated_at.isoformat(),
            ),
        )

    def add(self, session: SessionRecord) -> SessionRecord:
        with self._lock(self._lock_file):
            now = datetime.now(timezone.utc)
            updated = session.model_copy(update={"updated_at": now})
            # SQLiteに先に書く
            self._sqlite_insert(updated)
            # NAS CSVにも書く
            path = self._month_file(updated.check_in_at)
            records = self._read_file(path)
            records.append(updated)
            self._write_file(path, records)
            return updated

    def get_by_id(self, session_id: str) -> SessionRecord | None:
        # SQLiteから先に検索（直近2週間）
        if self._sqlite is not None:
            row = self._sqlite.execute(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if row is not None:
                return _sqlite_row_to_record(row)
        # NAS CSVにフォールバック
        for path in self._all_files():
            for r in self._read_file(path):
                if r.id == session_id:
                    return r
        return None

    def list_by_user(self, user_id: str) -> list[SessionRecord]:
        # NAS CSVから全期間取得
        nas_records: dict[str, SessionRecord] = {}
        for path in self._all_files():
            for r in self._read_file(path):
                if r.user_id == user_id:
                    nas_records[r.id] = r
        # SQLiteから直近分を上書き（より新しい updated_at を持つ可能性）
        if self._sqlite is not None:
            rows = self._sqlite.execute(
                "SELECT * FROM sessions WHERE user_id = ?", (user_id,)
            ).fetchall()
            for row in rows:
                nas_records[row["id"]] = _sqlite_row_to_record(row)
        result = list(nas_records.values())
        return sorted(result, key=lambda r: r.check_in_at, reverse=True)

    def list_all(self) -> list[SessionRecord]:
        # 全期間必要なためNAS CSVを使う
        result = []
        for path in self._all_files():
            result.extend(self._read_file(path))
        return sorted(result, key=lambda r: r.check_in_at, reverse=True)

    def get_open_session(self, user_id: str) -> SessionRecord | None:
        # SQLiteから先に検索（開いているセッションは必ず直近）
        if self._sqlite is not None:
            row = self._sqlite.execute(
                "SELECT * FROM sessions WHERE user_id = ? AND check_out_at IS NULL",
                (user_id,),
            ).fetchone()
            if row is not None:
                return _sqlite_row_to_record(row)
        # NAS CSVにフォールバック
        for path in self._all_files():
            for r in self._read_file(path):
                if r.user_id == user_id and r.check_out_at is None:
                    return r
        return None

    def delete_by_user(self, user_id: str) -> None:
        with self._lock(self._lock_file):
            for path in self._all_files():
                records = self._read_file(path)
                filtered = [r for r in records if r.user_id != user_id]
                if len(filtered) != len(records):
                    if filtered:
                        self._write_file(path, filtered)
                    else:
                        path.unlink()
        if self._sqlite is not None:
            self._sqlite.execute_and_commit(
                "DELETE FROM sessions WHERE user_id = ?", (user_id,)
            )

    def update(self, session: SessionRecord) -> SessionRecord:
        with self._lock(self._lock_file):
            now = datetime.now(timezone.utc)
            updated = session.model_copy(update={"updated_at": now})
            # SQLiteに先に書く
            self._sqlite_insert(updated)
            # NAS CSVにも書く
            path = self._month_file(updated.check_in_at)
            records = self._read_file(path)
            new_records = [updated if r.id == updated.id else r for r in records]
            self._write_file(path, new_records)
            return updated
