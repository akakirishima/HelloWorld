from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.models.lab import LabRecord
from app.models.room import RoomRecord
from app.store.base_store import BaseStore


def _sqlite_row_to_lab(row: object) -> LabRecord:
    return LabRecord(
        id=row["id"],
        name=row["name"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def _sqlite_row_to_room(row: object) -> RoomRecord:
    return RoomRecord(
        id=row["id"],
        lab_id=row["lab_id"],
        name=row["name"],
        display_order=row["display_order"],
        is_active=bool(row["is_active"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


class RoomStore(BaseStore):
    def __init__(self, root: Path, sqlite_db: SqliteDb | None = None) -> None:
        self.root = root
        self._file = root / "rooms.json"
        self._sqlite = sqlite_db

    def migrate_from_json_if_empty(self) -> None:
        """SQLiteにデータがない場合、既存 JSON からインポートする。"""
        if self._sqlite is None:
            return
        count = self._sqlite.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
        if count > 0:
            return
        data = self._load_json()
        lab_data = data.get("lab")
        if lab_data:
            lab = LabRecord.model_validate(lab_data)
            self._sqlite_upsert_lab(lab)
        for r_data in data.get("rooms", []):
            room = RoomRecord.model_validate(r_data)
            self._sqlite_upsert_room(room)

    # --- Lab ---

    def get_lab(self) -> LabRecord | None:
        if self._sqlite is not None:
            row = self._sqlite.execute("SELECT * FROM lab LIMIT 1").fetchone()
            return _sqlite_row_to_lab(row) if row is not None else None
        data = self._load_json()
        if not data["lab"]:
            return None
        return LabRecord.model_validate(data["lab"])

    def save_lab(self, lab: LabRecord) -> LabRecord:
        now = datetime.now(timezone.utc)
        updated = lab.model_copy(update={"updated_at": now})
        if self._sqlite is not None:
            self._sqlite_upsert_lab(updated)
        return updated

    # --- Rooms ---

    def list_rooms(self) -> list[RoomRecord]:
        if self._sqlite is not None:
            rows = self._sqlite.execute(
                "SELECT * FROM rooms ORDER BY display_order"
            ).fetchall()
            return [_sqlite_row_to_room(row) for row in rows]
        return [RoomRecord.model_validate(r) for r in self._load_json().get("rooms", [])]

    def get_room(self, room_id: int) -> RoomRecord | None:
        if self._sqlite is not None:
            row = self._sqlite.execute(
                "SELECT * FROM rooms WHERE id = ?", (room_id,)
            ).fetchone()
            return _sqlite_row_to_room(row) if row is not None else None
        for room in self.list_rooms():
            if room.id == room_id:
                return room
        return None

    def save_room(self, room: RoomRecord) -> RoomRecord:
        now = datetime.now(timezone.utc)
        updated = room.model_copy(update={"updated_at": now})
        if self._sqlite is not None:
            self._sqlite_upsert_room(updated)
        return updated

    def next_room_id(self) -> int:
        if self._sqlite is not None:
            row = self._sqlite.execute("SELECT MAX(id) FROM rooms").fetchone()
            max_id = row[0]
            return (max_id or 0) + 1
        rooms = self.list_rooms()
        if not rooms:
            return 1
        return max(r.id for r in rooms) + 1

    def delete_room(self, room_id: int) -> None:
        if self._sqlite is not None:
            self._sqlite.execute_and_commit(
                "DELETE FROM rooms WHERE id = ?", (room_id,)
            )

    def ensure_lab_and_rooms(self, lab_name: str, room_defs: list[dict]) -> tuple[LabRecord, list[RoomRecord]]:
        """シード用: lab と room を初期化して返す"""
        now = datetime.now(timezone.utc)

        existing_lab = self.get_lab()
        if existing_lab is None:
            lab = LabRecord(id=1, name=lab_name, created_at=now, updated_at=now)
        else:
            lab = existing_lab.model_copy(update={"name": lab_name, "updated_at": now})

        existing_rooms = self.list_rooms()
        rooms: list[RoomRecord] = []
        for idx, rd in enumerate(room_defs):
            if idx < len(existing_rooms):
                r = existing_rooms[idx].model_copy(
                    update={
                        "name": rd["name"],
                        "display_order": rd["display_order"],
                        "is_active": True,
                        "updated_at": now,
                    }
                )
            else:
                r = RoomRecord(
                    id=len(existing_rooms) + idx + 1,
                    lab_id=lab.id,
                    name=rd["name"],
                    display_order=rd["display_order"],
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            rooms.append(r)

        # SQLiteに書く
        if self._sqlite is not None:
            self._sqlite_upsert_lab(lab)
            for r in rooms:
                self._sqlite_upsert_room(r)

        return lab, rooms

    # --- SQLite helpers ---

    def _sqlite_upsert_lab(self, lab: LabRecord) -> None:
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO lab (id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (lab.id, lab.name, lab.created_at.isoformat(), lab.updated_at.isoformat()),
        )

    def _sqlite_upsert_room(self, room: RoomRecord) -> None:
        self._sqlite.execute_and_commit(
            """
            INSERT OR REPLACE INTO rooms
                (id, lab_id, name, display_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                room.id,
                room.lab_id,
                room.name,
                room.display_order,
                int(room.is_active),
                room.created_at.isoformat(),
                room.updated_at.isoformat(),
            ),
        )

    # --- JSON migration helpers ---

    def _load_json(self) -> dict:
        data = self._read_json(self._file)
        if not data:
            return {"lab": None, "rooms": []}
        return data
