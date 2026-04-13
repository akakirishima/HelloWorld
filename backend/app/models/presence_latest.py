from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PresenceRecord(BaseModel):
    user_id: str
    current_status: str
    current_session_id: str | None = None
    last_changed_at: datetime
    updated_at: datetime
