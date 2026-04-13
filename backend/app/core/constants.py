from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class PresenceStatus(str, Enum):
    ROOM = "Room"
    ON_CAMPUS = "On Campus"
    CLASS = "Class"
    SEMINAR = "Seminar"
    MEETING = "Meeting"
    OFF_CAMPUS = "Off Campus"


class SessionCloseReason(str, Enum):
    MANUAL_CHECKOUT = "manual_checkout"
    AUTO_TIMEOUT = "auto_timeout"
    ADMIN_CORRECTION = "admin_correction"
