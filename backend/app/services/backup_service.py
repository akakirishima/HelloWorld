from __future__ import annotations

import shutil
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import SplitResult, urlsplit, urlunsplit

from app.core.config import Settings, get_settings


def create_postgres_backup(
    *, settings: Settings | None = None, now: datetime | None = None
) -> Path:
    active_settings = settings or get_settings()
    database_url = active_settings.database_url
    if not database_url.startswith("postgresql"):
        raise RuntimeError(
            "PostgreSQL backup is only available for PostgreSQL databases."
        )

    current_time = now or datetime.now(timezone.utc)
    backup_dir = Path(active_settings.backup_root_path) / "postgres"
    backup_dir.mkdir(parents=True, exist_ok=True)

    output_path = backup_dir / f"app-{current_time.strftime('%Y%m%d-%H%M%S')}.dump"
    command = [
        "pg_dump",
        f"--dbname={_normalize_postgres_url(database_url)}",
        "--format=custom",
        f"--file={output_path}",
    ]
    subprocess.run(command, check=True)
    _trim_backup_generations(
        backup_dir,
        pattern="app-*.dump",
        retention_count=active_settings.backup_retention_count,
    )
    return output_path


def create_sqlite_backup(
    *, settings: Settings | None = None, now: datetime | None = None
) -> Path:
    active_settings = settings or get_settings()
    source_path = Path(active_settings.sqlite_path)
    if not source_path.exists():
        raise RuntimeError(f"SQLite database was not found: {source_path}")

    current_time = now or datetime.now(timezone.utc)
    backup_dir = Path(active_settings.backup_root_path) / "sqlite"
    backup_dir.mkdir(parents=True, exist_ok=True)

    output_path = backup_dir / f"app-{current_time.strftime('%Y%m%d-%H%M%S')}.db"
    _backup_sqlite_database(source_path=source_path, output_path=output_path)
    _trim_backup_generations(
        backup_dir,
        pattern="app-*.db",
        retention_count=active_settings.backup_retention_count,
    )
    return output_path


def _backup_sqlite_database(*, source_path: Path, output_path: Path) -> None:
    source = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
    try:
        with sqlite3.connect(output_path) as destination:
            source.backup(destination)
    finally:
        source.close()


def _normalize_postgres_url(database_url: str) -> str:
    split = urlsplit(database_url)
    normalized = SplitResult(
        scheme="postgresql",
        netloc=split.netloc,
        path=split.path,
        query=split.query,
        fragment=split.fragment,
    )
    return urlunsplit(normalized)


def _trim_backup_generations(
    backup_dir: Path, *, pattern: str, retention_count: int
) -> None:
    if retention_count <= 0:
        return

    existing = sorted(
        backup_dir.glob(pattern),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for stale_path in existing[retention_count:]:
        if stale_path.is_dir():
            shutil.rmtree(stale_path)
        else:
            stale_path.unlink()
