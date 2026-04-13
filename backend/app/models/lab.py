from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class LabRecord(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
