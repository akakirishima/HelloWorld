from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.bootstrap_service import seed_sample_data


def run_seed() -> None:
    with SessionLocal() as session:
        seed_sample_data(session)


if __name__ == "__main__":
    run_seed()
