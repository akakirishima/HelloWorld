from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.models.lab import LabRecord
from app.models.room import RoomRecord
from app.store.base_store import BaseStore


class RoomStore(BaseStore):
    def __init__(self, root: Path) -> None:
        super().__init__(root)
        self._file = root / "rooms.json"
        self._lock_file = root / ".locks" / "rooms.lock"

    def _load(self) -> dict:
        data = self._read_json(self._file)
        if not data:
            return {"lab": None, "rooms": []}
        return data

    def get_lab(self) -> LabRecord | None:
        data = self._load()
        if not data["lab"]:
            return None
        return LabRecord.model_validate(data["lab"])

    def save_lab(self, lab: LabRecord) -> LabRecord:
        with self._lock(self._lock_file):
            data = self._load()
            now = datetime.now(timezone.utc)
            updated = lab.model_copy(update={"updated_at": now})
            data["lab"] = updated.model_dump(mode="json")
            self._write_json_atomic(self._file, data)
            return updated

    def list_rooms(self) -> list[RoomRecord]:
        data = self._load()
        return [RoomRecord.model_validate(r) for r in data.get("rooms", [])]

    def get_room(self, room_id: int) -> RoomRecord | None:
        for room in self.list_rooms():
            if room.id == room_id:
                return room
        return None

    def save_room(self, room: RoomRecord) -> RoomRecord:
        with self._lock(self._lock_file):
            data = self._load()
            rooms = [RoomRecord.model_validate(r) for r in data.get("rooms", [])]
            now = datetime.now(timezone.utc)
            updated = room.model_copy(update={"updated_at": now})
            replaced = False
            new_list = []
            for existing in rooms:
                if existing.id == updated.id:
                    new_list.append(updated)
                    replaced = True
                else:
                    new_list.append(existing)
            if not replaced:
                if not updated.created_at:
                    updated = updated.model_copy(update={"created_at": now})
                new_list.append(updated)
            data["rooms"] = [r.model_dump(mode="json") for r in new_list]
            self._write_json_atomic(self._file, data)
            return updated

    def next_room_id(self) -> int:
        rooms = self.list_rooms()
        if not rooms:
            return 1
        return max(r.id for r in rooms) + 1

    def delete_room(self, room_id: int) -> None:
        with self._lock(self._lock_file):
            data = self._load()
            rooms = [RoomRecord.model_validate(r) for r in data.get("rooms", [])]
            data["rooms"] = [r.model_dump(mode="json") for r in rooms if r.id != room_id]
            self._write_json_atomic(self._file, data)

    def ensure_lab_and_rooms(self, lab_name: str, room_defs: list[dict]) -> tuple[LabRecord, list[RoomRecord]]:
        """シード用: lab と room を初期化して返す"""
        with self._lock(self._lock_file):
            data = self._load()
            now = datetime.now(timezone.utc)

            lab_data = data.get("lab")
            if lab_data is None:
                lab = LabRecord(id=1, name=lab_name, created_at=now, updated_at=now)
            else:
                lab = LabRecord.model_validate(lab_data)
                lab = lab.model_copy(update={"name": lab_name, "updated_at": now})

            rooms_data = data.get("rooms", [])
            existing = [RoomRecord.model_validate(r) for r in rooms_data]
            rooms: list[RoomRecord] = []
            for idx, rd in enumerate(room_defs):
                if idx < len(existing):
                    r = existing[idx].model_copy(
                        update={
                            "name": rd["name"],
                            "display_order": rd["display_order"],
                            "is_active": True,
                            "updated_at": now,
                        }
                    )
                else:
                    r = RoomRecord(
                        id=len(existing) + idx + 1,
                        lab_id=lab.id,
                        name=rd["name"],
                        display_order=rd["display_order"],
                        is_active=True,
                        created_at=now,
                        updated_at=now,
                    )
                rooms.append(r)

            data["lab"] = lab.model_dump(mode="json")
            data["rooms"] = [r.model_dump(mode="json") for r in rooms]
            self._write_json_atomic(self._file, data)
            return lab, rooms
