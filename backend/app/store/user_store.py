from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.user import UserRecord
from app.store.base_store import BaseStore


def _sqlite_row_to_record(row: object) -> UserRecord:
    return UserRecord(
        user_id=row["user_id"],
        full_name=row["full_name"],
        display_name=row["display_name"],
        password_hash=row["password_hash"],
        role=row["role"],
        affiliation=row["affiliation"],
        academic_year=row["academic_year"],
        room_id=row["room_id"],
        must_change_password=bool(row["must_change_password"]),
        last_login_at=datetime.fromisoformat(row["last_login_at"]) if row["last_login_at"] else None,
        is_active=bool(row["is_active"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class UserStore(BaseStore):
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._file = root / "users.json"
        self._sqlite = sqlite_db

    def migrate_from_json_if_empty(self) -> None:
        """SQLiteにユーザーがいない場合、既存 JSON からインポートする。"""
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count > 0:
            return
        users = self._read_from_json()
        for user in users:
            self._sqlite_upsert(user)

    def list_all(self) -> list[UserRecord]:
        if self._sqlite is not None:
            rows = self._sqlite.execute(
                "SELECT * FROM users ORDER BY created_at"
            ).fetchall()
            return [_sqlite_row_to_record(row) for row in rows]
        return self._read_from_json()

    def get_by_user_id(self, user_id: str) -> UserRecord | None:
        if self._sqlite is not None:
            row = self._sqlite.execute(
                "SELECT * FROM users WHERE user_id = ?", (user_id,)
            ).fetchone()
            return _sqlite_row_to_record(row) if row is not None else None
        for user in self._read_from_json():
            if user.user_id == user_id:
                return user
        return None

    def save(self, user: UserRecord) -> UserRecord:
        now = datetime.now(timezone.utc)
        updated = user.model_copy(update={"updated_at": now})
        # SQLiteに書く（主ストア）
        if self._sqlite is not None:
            self._sqlite_upsert(updated)
        return updated

    def delete(self, user_id: str) -> None:
        if self._sqlite is not None:
            self._sqlite.execute_and_commit(
                "DELETE FROM users WHERE user_id = ?", (user_id,)
            )

    # --- SQLite helpers ---

    def _sqlite_upsert(self, user: UserRecord) -> None:
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO users
                (user_id, full_name, display_name, password_hash, role,
                 affiliation, academic_year, room_id, must_change_password,
                 last_login_at, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user.user_id,
                user.full_name,
                user.display_name,
                user.password_hash,
                user.role,
                user.affiliation,
                user.academic_year,
                user.room_id,
                int(user.must_change_password),
                user.last_login_at.isoformat() if user.last_login_at else None,
                int(user.is_active),
                user.created_at.isoformat(),
                user.updated_at.isoformat(),
            ),
        )

    # --- JSON migration helpers ---

    def _read_from_json(self) -> list[UserRecord]:
        data = self._read_json(self._file)
        if not data:
            return []
        return [UserRecord.model_validate(item) for item in data]
