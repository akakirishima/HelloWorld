from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class StatusChangeRecord(BaseModel):
    id: str  # UUID
    user_id: str
    session_id: str | None = None
    from_status: str
    to_status: str
    changed_at: datetime
    changed_by: str | None = None  # user_id string
    source: str = "web"
