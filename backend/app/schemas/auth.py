from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    user_id: str = Field(min_length=1)
    password: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class MeResponse(BaseModel):
    user_id: str
    full_name: str
    display_name: str
    role: str
    academic_year: str
    room_id: int | None
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None


class AuthStatusResponse(BaseModel):
    message: str
    user: MeResponse | None = None
