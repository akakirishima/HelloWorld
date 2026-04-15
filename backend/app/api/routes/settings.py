from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, AppStores
from app.models.lab import LabRecord
from app.models.room import RoomRecord
from app.schemas.settings import (
    CreateRoomRequest,
    LabResponse,
    RoomListResponse,
    RoomResponse,
    UpdateLabRequest,
    UpdateRoomRequest,
)
from app.services.audit_service import create_audit_log

router = APIRouter()


@router.get("/settings/lab", response_model=LabResponse)
def get_lab(_: AdminUser, stores: AppStores) -> LabResponse:
    lab = _require_lab(stores)
    return LabResponse(id=lab.id, name=lab.name)


@router.patch("/settings/lab", response_model=LabResponse)
def update_lab(payload: UpdateLabRequest, admin: AdminUser, stores: AppStores) -> LabResponse:
    lab = _require_lab(stores)
    before = {"name": lab.name}
    updated = stores.rooms.save_lab(lab.model_copy(update={"name": payload.name}))
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="lab_update",
        target_type="labs",
        target_id=str(updated.id),
        before_json=before,
        after_json={"name": updated.name},
    )
    return LabResponse(id=updated.id, name=updated.name)


@router.get("/rooms", response_model=RoomListResponse)
def list_rooms(_: AdminUser, stores: AppStores) -> RoomListResponse:
    rooms = sorted(stores.rooms.list_rooms(), key=lambda r: (r.display_order, r.id))
    return RoomListResponse(items=[serialize_room(r) for r in rooms])


@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(payload: CreateRoomRequest, admin: AdminUser, stores: AppStores) -> RoomResponse:
    lab = _require_lab(stores)
    now = datetime.now(timezone.utc)
    room = RoomRecord(
        id=stores.rooms.next_room_id(),
        lab_id=lab.id,
        name=payload.name,
        display_order=payload.display_order,
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    room = stores.rooms.save_room(room)
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="room_create",
        target_type="rooms",
        target_id=str(room.id),
        after_json=serialize_room(room).model_dump(),
    )
    return serialize_room(room)


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    payload: UpdateRoomRequest,
    admin: AdminUser,
    stores: AppStores,
) -> RoomResponse:
    room = stores.rooms.get_room(room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    before = serialize_room(room).model_dump()
    data = payload.model_dump(exclude_unset=True)
    room = stores.rooms.save_room(room.model_copy(update=data))
    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="room_update",
        target_type="rooms",
        target_id=str(room.id),
        before_json=before,
        after_json=serialize_room(room).model_dump(),
    )
    return serialize_room(room)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, admin: AdminUser, stores: AppStores) -> None:
    room = stores.rooms.get_room(room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    assigned = [u for u in stores.users.list_all() if u.room_id == room_id]
    if assigned:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"この部屋には {len(assigned)} 人のメンバーが所属しています。先にメンバーの所属部屋を変更してください。",
        )

    create_audit_log(
        stores.audit,
        actor_user_id=admin.user_id,
        action="room_delete",
        target_type="rooms",
        target_id=str(room_id),
        before_json={"room_id": room_id, "name": room.name},
    )
    stores.rooms.delete_room(room_id)


def _require_lab(stores: AppStores) -> LabRecord:
    lab = stores.rooms.get_lab()
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found.")
    return lab


def serialize_room(room: RoomRecord) -> RoomResponse:
    return RoomResponse(
        id=room.id,
        lab_id=room.lab_id,
        name=room.name,
        display_order=room.display_order,
        is_active=room.is_active,
    )
