from __future__ import annotations

from app.services.backup_service import create_sqlite_backup


def main() -> None:
    backup_path = create_sqlite_backup()
    print(f"SQLite backup created: {backup_path}")


if __name__ == "__main__":
    main()
