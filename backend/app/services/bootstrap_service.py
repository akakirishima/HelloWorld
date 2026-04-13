from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.constants import PresenceStatus, UserRole
from app.core.security import get_password_hash
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.store import Stores, make_stores

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


def seed_sample_data(stores: Stores) -> None:
    # すでにユーザーが存在する場合はスキップ
    if stores.users.list_all():
        return

    _lab, rooms = stores.rooms.ensure_lab_and_rooms(LAB_NAME, list(ROOMS))
    rooms_by_name = {r.name: r for r in rooms}

    now = datetime.now(timezone.utc)
    from app.models.user import UserRecord

    for payload in SAMPLE_USERS:
        room = rooms_by_name[payload["room_name"]]
        user = UserRecord(
            user_id=payload["user_id"],
            full_name=payload["full_name"],
            display_name=payload["display_name"],
            password_hash=get_password_hash(payload["password"]),
            role=payload["role"],
            affiliation="",
            academic_year=payload["academic_year"],
            room_id=room.id,
            must_change_password=payload["must_change_password"],
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        stores.users.save(user)

        current_status = payload["current_status"]
        session_id = None
        if current_status != PresenceStatus.OFF_CAMPUS.value:
            session = SessionRecord(
                id=str(uuid.uuid4()),
                user_id=user.user_id,
                check_in_at=now,
                check_out_at=None,
                duration_sec=None,
                close_reason=None,
                created_at=now,
                updated_at=now,
            )
            session = stores.sessions.add(session)
            session_id = session.id

        stores.presence.save(PresenceRecord(
            user_id=user.user_id,
            current_status=current_status,
            current_session_id=session_id,
            last_changed_at=now,
            updated_at=now,
        ))


def run_seed(root: Path) -> None:
    stores = make_stores(root)
    seed_sample_data(stores)
