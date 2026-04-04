from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings, get_settings


def create_postgres_backup(
    *,
    settings: Settings | None = None,
    now: datetime | None = None,
) -> Path:
    active_settings = settings or get_settings()
    if not active_settings.database_url.startswith("postgresql"):
        raise RuntimeError("PostgreSQL backup requires a postgresql database_url.")

    timestamp = (now or datetime.now(timezone.utc)).strftime("%Y%m%d-%H%M%S")
    backup_dir = Path(active_settings.backup_root_path) / "postgres"
    backup_dir.mkdir(parents=True, exist_ok=True)
    output_path = backup_dir / f"app-{timestamp}.dump"

    subprocess.run(
        [
            "pg_dump",
            active_settings.database_url,
            "--format=custom",
            f"--file={output_path}",
        ],
        check=True,
    )

    _cleanup_old_backups(backup_dir, active_settings.backup_retention_count)
    return output_path


def _cleanup_old_backups(backup_dir: Path, retention_count: int) -> None:
    if retention_count <= 0:
        return

    backups = sorted(backup_dir.glob("app-*.dump"), key=lambda path: path.name, reverse=True)
    for stale_path in backups[retention_count:]:
        stale_path.unlink(missing_ok=True)
