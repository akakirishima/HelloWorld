from __future__ import annotations

from app.services.backup_service import create_postgres_backup


def main() -> None:
    backup_path = create_postgres_backup()
    print(f"PostgreSQL backup created: {backup_path}")


if __name__ == "__main__":
    main()
