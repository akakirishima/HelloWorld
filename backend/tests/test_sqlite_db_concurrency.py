from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from app.db.sqlite_db import SqliteDb


def test_concurrent_reads_across_tables_do_not_corrupt_rows(tmp_path: Path) -> None:
    db = SqliteDb(tmp_path / "concurrency.db")
    now = datetime.now(timezone.utc).isoformat()

    user_ids = [f"user-{i}" for i in range(5)]
    for user_id in user_ids:
        db.execute_and_commit(
            """
            INSERT INTO users
                (user_id, full_name, display_name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, user_id, user_id, "hash", "member", now, now),
        )
        db.execute_and_commit(
            "INSERT INTO rooms (id, lab_id, name, created_at, updated_at) VALUES (?, 1, ?, ?, ?)",
            (user_ids.index(user_id) + 1, user_id, now, now),
        )

    errors: list[str] = []

    def read_user(user_id: str) -> None:
        row = db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if row is None:
            errors.append(f"{user_id}: missing row")
            return
        if row["created_at"] != now or row["user_id"] != user_id:
            errors.append(f"{user_id}: corrupted row {dict(row)}")

    def read_rooms() -> None:
        rows = db.execute("SELECT * FROM rooms ORDER BY id").fetchall()
        if len(rows) != len(user_ids):
            errors.append(f"rooms: expected {len(user_ids)} rows, got {len(rows)}")

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = []
        for _ in range(60):
            for user_id in user_ids:
                futures.append(pool.submit(read_user, user_id))
            futures.append(pool.submit(read_rooms))
        for future in futures:
            future.result()

    assert errors == []
