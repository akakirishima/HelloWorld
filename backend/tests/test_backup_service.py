from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.core.config import Settings
from app.services.backup_service import create_postgres_backup


def test_create_postgres_backup_keeps_recent_generations(monkeypatch, tmp_path: Path) -> None:
    created_files: list[Path] = []

    def fake_run(command: list[str], check: bool) -> None:
        assert check is True
        output_arg = next(part for part in command if part.startswith("--file="))
        output_path = Path(output_arg.split("=", 1)[1])
        output_path.write_text("backup", encoding="utf-8")
        created_files.append(output_path)

    settings = Settings(
        database_url="postgresql+psycopg://labapp:secret@postgres:5432/labapp",
        backup_root_path=str(tmp_path),
        backup_retention_count=2,
    )
    monkeypatch.setattr("app.services.backup_service.subprocess.run", fake_run)

    create_postgres_backup(settings=settings, now=datetime(2026, 4, 5, 10, 0, tzinfo=timezone.utc))
    create_postgres_backup(settings=settings, now=datetime(2026, 4, 5, 11, 0, tzinfo=timezone.utc))
    latest = create_postgres_backup(settings=settings, now=datetime(2026, 4, 5, 12, 0, tzinfo=timezone.utc))

    backup_dir = tmp_path / "postgres"
    remaining = sorted(path.name for path in backup_dir.glob("app-*.dump"))
    assert len(remaining) == 2
    assert latest.name in remaining
    assert created_files[-1] == latest


def test_create_postgres_backup_rejects_non_postgres_database(tmp_path: Path) -> None:
    settings = Settings(database_url="sqlite:///./data/app.db", backup_root_path=str(tmp_path))

    with pytest.raises(RuntimeError):
        create_postgres_backup(settings=settings)
