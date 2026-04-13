from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class RoomRecord(BaseModel):
    id: int
    lab_id: int
    name: str
    display_order: int = 1
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
