from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings
from app.services.backup_service import create_sqlite_backup


def test_create_sqlite_backup_keeps_recent_generations(tmp_path: Path) -> None:
    db_path = tmp_path / "sqlite" / "local.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as connection:
        connection.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY, label TEXT NOT NULL)")
        connection.execute("INSERT INTO sample (label) VALUES ('first')")
        connection.commit()

    settings = Settings(
        sqlite_path=str(db_path),
        backup_root_path=str(tmp_path / "backups"),
        backup_retention_count=2,
    )

    create_sqlite_backup(settings=settings, now=datetime(2026, 4, 5, 10, 0, tzinfo=timezone.utc))
    create_sqlite_backup(settings=settings, now=datetime(2026, 4, 5, 11, 0, tzinfo=timezone.utc))
    latest = create_sqlite_backup(settings=settings, now=datetime(2026, 4, 5, 12, 0, tzinfo=timezone.utc))

    backup_dir = tmp_path / "backups" / "sqlite"
    remaining = sorted(path.name for path in backup_dir.glob("app-*.db"))
    assert len(remaining) == 2
    assert latest.name in remaining

    with sqlite3.connect(latest) as connection:
        rows = connection.execute("SELECT label FROM sample").fetchall()
    assert rows == [("first",)]
