from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class UserPresenceResponse(BaseModel):
    current_status: str
    last_changed_at: datetime | None


class UserResponse(BaseModel):
    user_id: str
    full_name: str
    display_name: str
    role: str
    academic_year: str
    room_id: int | None
    room_name: str | None
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None
    presence: UserPresenceResponse | None


class CreateUserRequest(BaseModel):
    user_id: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    password: str = Field(min_length=8)
    role: str
    academic_year: str = Field(min_length=1)
    room_id: int | None = None
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    display_name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = None
    academic_year: str | None = None
    room_id: int | None = None
    is_active: bool | None = None
    must_change_password: bool | None = None


class UserListResponse(BaseModel):
    items: list[UserResponse]
