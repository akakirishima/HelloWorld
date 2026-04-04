"""Add Google OAuth token and note sheet binding tables."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0005_google_notes_tables"
down_revision = "0004_users_password_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_google_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("google_subject", sa.String(length=255), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("expiry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_google_tokens_user_id", "user_google_tokens", ["user_id"], unique=True)

    op.create_table(
        "note_sheet_bindings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("spreadsheet_id", sa.String(length=255), nullable=False),
        sa.Column("sheet_name", sa.String(length=128), nullable=False, server_default="notes"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_note_sheet_bindings_user_id", "note_sheet_bindings", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_note_sheet_bindings_user_id", table_name="note_sheet_bindings")
    op.drop_table("note_sheet_bindings")
    op.drop_index("ix_user_google_tokens_user_id", table_name="user_google_tokens")
    op.drop_table("user_google_tokens")
