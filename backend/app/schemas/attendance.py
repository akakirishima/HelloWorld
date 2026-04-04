from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

AttendanceStatus = Literal["Room", "On Campus", "Class", "Seminar", "Meeting", "Off Campus"]
CheckInStatus = Literal["Room", "On Campus", "Class", "Seminar", "Meeting"]


class CheckInRequest(BaseModel):
    target_user_id: str | None = None
    initial_status: CheckInStatus = "Room"


class CheckOutRequest(BaseModel):
    target_user_id: str | None = None


class ChangeStatusRequest(BaseModel):
    target_user_id: str | None = None
    to_status: AttendanceStatus
