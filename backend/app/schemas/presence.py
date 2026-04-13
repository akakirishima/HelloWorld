from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PresenceItem(BaseModel):
    user_id: str
    display_name: str
    academic_year: str
    room_id: int | None
    room_name: str | None
    current_status: str
    current_session_id: str | None
    last_changed_at: datetime | None
    today_check_in_at: datetime | None


class PresenceListResponse(BaseModel):
    items: list[PresenceItem]


class PresenceMeResponse(PresenceItem):
    pass
