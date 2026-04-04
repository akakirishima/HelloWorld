from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.constants import PresenceStatus, UserRole
from app.core.security import get_password_hash
from app.models.lab import Lab
from app.models.note import Note
from app.models.presence_latest import PresenceLatest
from app.models.room import Room
from app.models.session import Session as AttendanceSession
from app.models.status_change import StatusChange
from app.models.user import User
from app.repositories.user_repository import UserRepository

LAB_NAME = "情報処理研究室"

ROOMS = (
    {"name": "E103", "display_order": 1},
    {"name": "E710", "display_order": 2},
)

SAMPLE_USERS = (
    {
        "user_id": "admin",
        "full_name": "Lab Administrator",
        "display_name": "管理者",
        "role": UserRole.ADMIN.value,
        "academic_year": "Researcher",
        "password": "admin1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.ROOM.value,
    },
    {
        "user_id": "san-chain-htun",
        "full_name": "San Chain Htun",
        "display_name": "San Chain Htun",
        "role": UserRole.MEMBER.value,
        "academic_year": "D2",
        "password": "sanchain1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "bo-bo-myint",
        "full_name": "Bo Bo Myint",
        "display_name": "Bo Bo Myint",
        "role": UserRole.MEMBER.value,
        "academic_year": "D1",
        "password": "bobo1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "ishikawa-taichi",
        "full_name": "Ishikawa Taichi",
        "display_name": "Ishikawa Taichi",
        "role": UserRole.MEMBER.value,
        "academic_year": "M2",
        "password": "ishikawa1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "aung-si-thu-moe",
        "full_name": "Aung Si Thu Moe",
        "display_name": "Aung Si Thu Moe",
        "role": UserRole.MEMBER.value,
        "academic_year": "M2",
        "password": "aungsithu1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "pyae-phyo-kyaw",
        "full_name": "Pyae Phyo Kyaw",
        "display_name": "Pyae Phyo Kyaw",
        "role": UserRole.MEMBER.value,
        "academic_year": "M2",
        "password": "pyaephyo1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "mon-aung",
        "full_name": "Mon Aung",
        "display_name": "Mon Aung",
        "role": UserRole.MEMBER.value,
        "academic_year": "Researcher",
        "password": "monaung1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "nyi-zaw-aung",
        "full_name": "Nyi Zaw Aung",
        "display_name": "Nyi Zaw Aung",
        "role": UserRole.MEMBER.value,
        "academic_year": "Researcher",
        "password": "nyizaw1234",
        "room_name": "E103",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "tunn-cho-lwin",
        "full_name": "Tunn Cho Lwin",
        "display_name": "Tunn Cho Lwin",
        "role": UserRole.MEMBER.value,
        "academic_year": "D3",
        "password": "tunn1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "shimizu-yuichiro",
        "full_name": "Shimizu Yuichiro",
        "display_name": "Shimizu Yuichiro",
        "role": UserRole.MEMBER.value,
        "academic_year": "M2",
        "password": "shimizu1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "shihara-yo",
        "full_name": "Shihara Yo",
        "display_name": "Shihara Yo",
        "role": UserRole.MEMBER.value,
        "academic_year": "M2",
        "password": "shihara1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "nakashima-remon",
        "full_name": "Nakashima Remon",
        "display_name": "Nakashima Remon",
        "role": UserRole.MEMBER.value,
        "academic_year": "M1",
        "password": "nakashima1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.ROOM.value,
    },
    {
        "user_id": "nishimoto-daichi",
        "full_name": "Nishimoto Daichi",
        "display_name": "Nishimoto Daichi",
        "role": UserRole.MEMBER.value,
        "academic_year": "M1",
        "password": "nishimoto1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "murayama-takumi",
        "full_name": "Murayama Takumi",
        "display_name": "Murayama Takumi",
        "role": UserRole.MEMBER.value,
        "academic_year": "M1",
        "password": "murayama1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "myo-pone-pone-swe",
        "full_name": "Myo Pone Pone Swe",
        "display_name": "Myo Pone Pone Swe",
        "role": UserRole.MEMBER.value,
        "academic_year": "M1",
        "password": "myo1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "shibahara-naoki",
        "full_name": "Shibahara Naoki",
        "display_name": "Shibahara Naoki",
        "role": UserRole.MEMBER.value,
        "academic_year": "B4",
        "password": "shibahara1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "tokito-naoya",
        "full_name": "Tokito Naoya",
        "display_name": "Tokito Naoya",
        "role": UserRole.MEMBER.value,
        "academic_year": "B4",
        "password": "tokito1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "matsushita-naohide",
        "full_name": "Matsushita Naohide",
        "display_name": "Matsushita Naohide",
        "role": UserRole.MEMBER.value,
        "academic_year": "B4",
        "password": "matsushita1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "matsumoto-hiroki",
        "full_name": "Matsumoto Hiroki",
        "display_name": "Matsumoto Hiroki",
        "role": UserRole.MEMBER.value,
        "academic_year": "B4",
        "password": "matsumoto1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "uchikura-koki",
        "full_name": "Uchikura Koki",
        "display_name": "Uchikura Koki",
        "role": UserRole.MEMBER.value,
        "academic_year": "B4",
        "password": "uchikura1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.OFF_CAMPUS.value,
    },
    {
        "user_id": "khaing-pan-ei-wai",
        "full_name": "Khaing Pan Ei Wai",
        "display_name": "Khaing Pan Ei Wai",
        "role": UserRole.MEMBER.value,
        "academic_year": "Researcher",
        "password": "khaing1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.ROOM.value,
    },
    {
        "user_id": "theethawat-savastam",
        "full_name": "Theethawat Savastam",
        "display_name": "Theethawat Savastam",
        "role": UserRole.MEMBER.value,
        "academic_year": "Researcher",
        "password": "theethawat1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.ROOM.value,
    },
    {
        "user_id": "htar-wuityi",
        "full_name": "Htar Wuityi",
        "display_name": "Htar Wuityi",
        "role": UserRole.MEMBER.value,
        "academic_year": "Researcher",
        "password": "htar1234",
        "room_name": "E710",
        "must_change_password": False,
        "current_status": PresenceStatus.ROOM.value,
    },
)


def seed_sample_data(session: Session) -> None:
    repository = UserRepository(session)
    lab = session.query(Lab).order_by(Lab.id.asc()).first()

    if lab is None:
        lab = Lab(name=LAB_NAME)
        session.add(lab)
        session.flush()
    elif lab.name != LAB_NAME:
        lab.name = LAB_NAME

    rooms_by_name: dict[str, Room] = {}
    existing_rooms = (
        session.query(Room).filter(Room.lab_id == lab.id).order_by(Room.display_order.asc(), Room.id.asc()).all()
    )
    for index, payload in enumerate(ROOMS):
        room = existing_rooms[index] if index < len(existing_rooms) else None
        if room is None:
            room = Room(
                lab_id=lab.id,
                name=payload["name"],
                display_order=payload["display_order"],
                is_active=True,
            )
            session.add(room)
            session.flush()
        else:
            room.name = payload["name"]
            room.display_order = payload["display_order"]
            room.is_active = True
        rooms_by_name[room.name] = room

    allowed_user_ids = {payload["user_id"] for payload in SAMPLE_USERS}
    stale_user_ids = [
        row[0] for row in session.query(User.id).filter(User.user_id.not_in(allowed_user_ids)).all()
    ]
    if stale_user_ids:
        session.query(NoteSheetBinding).filter(NoteSheetBinding.user_id.in_(stale_user_ids)).delete(
            synchronize_session=False
        )
        session.query(UserGoogleToken).filter(UserGoogleToken.user_id.in_(stale_user_ids)).delete(
            synchronize_session=False
        )
        session.query(Note).filter(Note.user_id.in_(stale_user_ids)).delete(synchronize_session=False)
        session.query(StatusChange).filter(StatusChange.user_id.in_(stale_user_ids)).delete(
            synchronize_session=False
        )
        session.query(StatusChange).filter(StatusChange.changed_by.in_(stale_user_ids)).update(
            {StatusChange.changed_by: None},
            synchronize_session=False,
        )
        session.query(AttendanceSession).filter(AttendanceSession.user_id.in_(stale_user_ids)).delete(
            synchronize_session=False
        )
        session.query(PresenceLatest).filter(PresenceLatest.user_id.in_(stale_user_ids)).delete(
            synchronize_session=False
        )
        session.query(User).filter(User.id.in_(stale_user_ids)).delete(synchronize_session=False)
        session.flush()

    extra_room_ids = [room.id for room in existing_rooms[len(ROOMS) :]]
    if extra_room_ids:
        session.query(User).filter(User.room_id.in_(extra_room_ids)).update(
            {User.room_id: None},
            synchronize_session=False,
        )
        session.query(Room).filter(Room.id.in_(extra_room_ids)).delete(synchronize_session=False)
    session.flush()

    for payload in SAMPLE_USERS:
        user = repository.get_by_user_id(payload["user_id"])
        if user is None:
            user = User(
                user_id=payload["user_id"],
                full_name=payload["full_name"],
                display_name=payload["display_name"],
                password_hash=get_password_hash(payload["password"]),
                role=payload["role"],
                affiliation="",
                academic_year=payload["academic_year"],
                room_id=rooms_by_name[payload["room_name"]].id,
                must_change_password=payload["must_change_password"],
                is_active=True,
            )
            repository.save(user)
        else:
            user.full_name = payload["full_name"]
            user.display_name = payload["display_name"]
            user.role = payload["role"]
            user.affiliation = ""
            user.academic_year = payload["academic_year"]
            user.room_id = rooms_by_name[payload["room_name"]].id
            user.must_change_password = payload["must_change_password"]
            user.is_active = True

        if user.presence is None:
            presence = PresenceLatest(
                user_id=user.id,
                current_status=payload["current_status"],
                current_session_id=None,
                last_changed_at=datetime.now(timezone.utc),
            )
            session.add(presence)
            session.flush()
        else:
            presence = user.presence
            presence.current_status = payload["current_status"]
            presence.last_changed_at = datetime.now(timezone.utc)

        open_session = (
            session.query(AttendanceSession)
            .filter(AttendanceSession.user_id == user.id, AttendanceSession.check_out_at.is_(None))
            .order_by(AttendanceSession.check_in_at.desc())
            .first()
        )
        if presence.current_status != PresenceStatus.OFF_CAMPUS.value:
            if open_session is None:
                open_session = AttendanceSession(
                    user_id=user.id,
                    check_in_at=datetime.now(timezone.utc),
                    check_out_at=None,
                    duration_sec=None,
                    close_reason=None,
                )
                session.add(open_session)
                session.flush()
            presence.current_session_id = open_session.id
        else:
            presence.current_session_id = None

    session.commit()
