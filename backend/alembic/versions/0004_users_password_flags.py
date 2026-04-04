"""Add password-change and last-login fields to users."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_users_password_flags"
down_revision = "0003_users_academic_year"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("must_change_password")
