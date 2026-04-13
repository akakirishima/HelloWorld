from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AuditLogRecord(BaseModel):
    id: str  # UUID
    actor_user_id: str | None = None
    action: str
    target_type: str
    target_id: str
    before_json: str | None = None  # JSON encoded string
    after_json: str | None = None   # JSON encoded string
    reason: str | None = None
    created_at: datetime
