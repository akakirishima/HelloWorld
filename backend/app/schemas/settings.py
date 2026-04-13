from __future__ import annotations

from pydantic import BaseModel, Field


class LabResponse(BaseModel):
    id: int
    name: str


class UpdateLabRequest(BaseModel):
    name: str = Field(min_length=1)


class RoomResponse(BaseModel):
    id: int
    lab_id: int
    name: str
    display_order: int
    is_active: bool


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1)
    display_order: int = Field(default=1, ge=1)
    is_active: bool = True


class UpdateRoomRequest(BaseModel):
    name: str | None = None
    display_order: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class RoomListResponse(BaseModel):
    items: list[RoomResponse]


