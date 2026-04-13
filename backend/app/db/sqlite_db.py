from __future__ import annotations

import sqlite3
import threading
from datetime import datetime
from pathlib import Path


_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    check_in_at TEXT NOT NULL,
    check_out_at TEXT,
    duration_sec INTEGER,
    close_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_checkin ON sessions(check_in_at);

CREATE TABLE IF NOT EXISTS status_changes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    changed_by TEXT,
    source TEXT NOT NULL DEFAULT 'web'
);
CREATE INDEX IF NOT EXISTS idx_sc_changed_at ON status_changes(changed_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_al_created_at ON audit_logs(created_at);
"""


class SqliteDb:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(
            str(path),
            check_same_thread=False,
            isolation_level=None,  # autocommit off; we commit manually
        )
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(_SCHEMA)

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            return self._conn.execute(sql, params)

    def executemany(self, sql: str, params_seq: list[tuple]) -> None:
        with self._lock:
            self._conn.executemany(sql, params_seq)

    def commit(self) -> None:
        with self._lock:
            self._conn.commit()

    def execute_and_commit(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, params)
            self._conn.commit()
            return cur

    def purge_old_records(self, cutoff: datetime) -> None:
        cutoff_iso = cutoff.isoformat()
        with self._lock:
            self._conn.execute(
                "DELETE FROM sessions WHERE check_in_at < ?", (cutoff_iso,)
            )
            self._conn.execute(
                "DELETE FROM status_changes WHERE changed_at < ?", (cutoff_iso,)
            )
            self._conn.execute(
                "DELETE FROM audit_logs WHERE created_at < ?", (cutoff_iso,)
            )
            self._conn.commit()

    def close(self) -> None:
        self._conn.close()
