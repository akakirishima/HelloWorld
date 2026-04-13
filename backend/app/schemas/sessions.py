from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SessionItem(BaseModel):
    id: str
    user_id: str
    display_name: str
    check_in_at: datetime
    check_out_at: datetime | None
    duration_sec: int | None
    close_reason: str | None


class SessionListResponse(BaseModel):
    items: list[SessionItem]


class PatchSessionRequest(BaseModel):
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    reason: str = Field(min_length=1)
