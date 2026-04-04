from __future__ import annotations

from app.services.backup_service import create_postgres_backup


def main() -> None:
    output_path = create_postgres_backup()
    print(output_path)


if __name__ == "__main__":
    main()
