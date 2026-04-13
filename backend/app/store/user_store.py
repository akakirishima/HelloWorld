from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.models.user import UserRecord
from app.store.base_store import BaseStore


class UserStore(BaseStore):
    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self._file = root / "users.json"
        self._lock_file = root / ".locks" / "users.lock"

    def list_all(self) -> list[UserRecord]:
        data = self._read_json(self._file)
        if not data:
            return []
        return [UserRecord.model_validate(item) for item in data]

    def get_by_user_id(self, user_id: str) -> UserRecord | None:
        for user in self.list_all():
            if user.user_id == user_id:
                return user
        return None

    def save(self, user: UserRecord) -> UserRecord:
        with self._lock(self._lock_file):
            users = self.list_all()
            now = datetime.now(timezone.utc)
            updated = user.model_copy(update={"updated_at": now})
            replaced = False
            new_list = []
            for existing in users:
                if existing.user_id == updated.user_id:
                    new_list.append(updated)
                    replaced = True
                else:
                    new_list.append(existing)
            if not replaced:
                if not updated.created_at:
                    updated = updated.model_copy(update={"created_at": now})
                new_list.append(updated)
            self._write_json_atomic(self._file, [u.model_dump(mode="json") for u in new_list])
            return updated

    def delete(self, user_id: str) -> None:
        with self._lock(self._lock_file):
            users = self.list_all()
            new_list = [u for u in users if u.user_id != user_id]
            self._write_json_atomic(self._file, [u.model_dump(mode="json") for u in new_list])
