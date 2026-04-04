from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models import (  # noqa: E402,F401
    audit_log,
    lab,
    note,
    note_sheet_binding,
    presence_latest,
    room,
    session,
    status_change,
    user,
    user_google_token,
)
