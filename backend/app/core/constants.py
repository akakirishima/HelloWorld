from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"


class PresenceStatus(StrEnum):
    ROOM = "Room"
    ON_CAMPUS = "On Campus"
    CLASS = "Class"
    SEMINAR = "Seminar"
    MEETING = "Meeting"
    OFF_CAMPUS = "Off Campus"


class SessionCloseReason(StrEnum):
    MANUAL_CHECKOUT = "manual_checkout"
    AUTO_TIMEOUT = "auto_timeout"
    ADMIN_CORRECTION = "admin_correction"
