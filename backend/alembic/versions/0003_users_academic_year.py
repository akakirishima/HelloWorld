"""Add academic year to users."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_users_academic_year"
down_revision = "0002_labs_rooms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("academic_year", sa.String(length=32), nullable=False, server_default="Researcher")
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("academic_year")
