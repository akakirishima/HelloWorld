from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class NoteRecord(BaseModel):
    id: str
    user_id: str
    note_date: date
    title: str
    did_today: str
    future_tasks: str
    created_at: datetime
    updated_at: datetime
