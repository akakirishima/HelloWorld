from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserRecord(BaseModel):
    user_id: str
    full_name: str
    display_name: str
    password_hash: str
    role: str
    affiliation: str = ""
    academic_year: str = "Researcher"
    room_id: int | None = None
    must_change_password: bool = True
    last_login_at: datetime | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
