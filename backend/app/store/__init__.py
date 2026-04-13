from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.db.sqlite_db import SqliteDb
from app.store.audit_store import AuditStore
from app.store.presence_store import PresenceStore
from app.store.room_store import RoomStore
from app.store.session_store import SessionStore
from app.store.status_change_store import StatusChangeStore
from app.store.user_store import UserStore


@dataclass
class Stores:
    users: UserStore
    rooms: RoomStore
    presence: PresenceStore
    sessions: SessionStore
    status_changes: StatusChangeStore
    audit: AuditStore


def make_stores(root: Path, sqlite_db: SqliteDb | None = None) -> Stores:
    return Stores(
        users=UserStore(root),
        rooms=RoomStore(root),
        presence=PresenceStore(root),
        sessions=SessionStore(root, sqlite_db=sqlite_db),
        status_changes=StatusChangeStore(root, sqlite_db=sqlite_db),
        audit=AuditStore(root, sqlite_db=sqlite_db),
    )
