from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SessionRecord(BaseModel):
    id: str  # UUID
    user_id: str
    check_in_at: datetime
    check_out_at: datetime | None = None
    duration_sec: int | None = None
    close_reason: str | None = None
    created_at: datetime
    updated_at: datetime
