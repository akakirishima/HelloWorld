from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.models.presence_latest import PresenceRecord
from app.store.base_store import BaseStore


class PresenceStore(BaseStore):
    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self._file = root / "presence.json"
        self._lock_file = root / ".locks" / "presence.lock"

    def _load(self) -> dict[str, dict]:
        data = self._read_json(self._file)
        if not data:
            return {}
        return data

    def get(self, user_id: str) -> PresenceRecord | None:
        data = self._load()
        item = data.get(user_id)
        if item is None:
            return None
        return PresenceRecord.model_validate(item)

    def list_all(self) -> list[PresenceRecord]:
        data = self._load()
        return [PresenceRecord.model_validate(v) for v in data.values()]

    def save(self, presence: PresenceRecord) -> PresenceRecord:
        with self._lock(self._lock_file):
            data = self._load()
            now = datetime.now(timezone.utc)
            updated = presence.model_copy(update={"updated_at": now})
            data[updated.user_id] = updated.model_dump(mode="json")
            self._write_json_atomic(self._file, data)
            return updated

    def delete(self, user_id: str) -> None:
        with self._lock(self._lock_file):
            data = self._load()
            data.pop(user_id, None)
            self._write_json_atomic(self._file, data)

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
