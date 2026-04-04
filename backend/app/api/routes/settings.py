from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, DbSession
from app.models.lab import Lab
from app.models.note_sheet_binding import NoteSheetBinding
from app.models.room import Room
from app.models.user import User
from app.schemas.settings import (
    CreateRoomRequest,
    LabResponse,
    NoteSheetBindingItem,
    NoteSheetBindingListResponse,
    NoteSheetBindingUpdateRequest,
    RoomListResponse,
    RoomResponse,
    UpdateLabRequest,
    UpdateRoomRequest,
)
from app.services.audit_service import create_audit_log

router = APIRouter()


@router.get("/settings/lab", response_model=LabResponse)
def get_lab(_: AdminUser, db: DbSession) -> LabResponse:
    lab = get_single_lab(db)
    return LabResponse(id=lab.id, name=lab.name)


@router.patch("/settings/lab", response_model=LabResponse)
def update_lab(payload: UpdateLabRequest, admin: AdminUser, db: DbSession) -> LabResponse:
    lab = get_single_lab(db)
    before = {"name": lab.name}
    lab.name = payload.name
    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="lab_update",
        target_type="labs",
        target_id=str(lab.id),
        before_json=before,
        after_json={"name": lab.name},
    )
    db.commit()
    return LabResponse(id=lab.id, name=lab.name)


@router.get("/rooms", response_model=RoomListResponse)
def list_rooms(_: AdminUser, db: DbSession) -> RoomListResponse:
    lab = get_single_lab(db)
    rooms = db.query(Room).filter(Room.lab_id == lab.id).order_by(Room.display_order.asc(), Room.id.asc()).all()
    return RoomListResponse(items=[serialize_room(room) for room in rooms])


@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(payload: CreateRoomRequest, admin: AdminUser, db: DbSession) -> RoomResponse:
    lab = get_single_lab(db)
    room = Room(
        lab_id=lab.id,
        name=payload.name,
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(room)
    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="room_create",
        target_type="rooms",
        target_id=str(room.id),
        after_json=serialize_room(room).model_dump(),
    )
    db.commit()
    db.refresh(room)
    return serialize_room(room)


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    payload: UpdateRoomRequest,
    admin: AdminUser,
    db: DbSession,
) -> RoomResponse:
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    before = serialize_room(room).model_dump()
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(room, field, value)

    db.flush()
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="room_update",
        target_type="rooms",
        target_id=str(room.id),
        before_json=before,
        after_json=serialize_room(room).model_dump(),
    )
    db.commit()
    db.refresh(room)
    return serialize_room(room)


@router.get("/settings/note-sheet-bindings", response_model=NoteSheetBindingListResponse)
def list_note_sheet_bindings(_: AdminUser, db: DbSession) -> NoteSheetBindingListResponse:
    users = db.query(User).order_by(User.display_name.asc()).all()
    bindings = {
        binding.user_id: binding
        for binding in db.query(NoteSheetBinding).order_by(NoteSheetBinding.id.asc()).all()
    }
    items: list[NoteSheetBindingItem] = []
    for user in users:
        binding = bindings.get(user.id)
        items.append(
            NoteSheetBindingItem(
                user_id=user.user_id,
                display_name=user.display_name,
                spreadsheet_id=binding.spreadsheet_id if binding else "",
                sheet_name=binding.sheet_name if binding else "notes",
                is_active=binding.is_active if binding else False,
            )
        )
    return NoteSheetBindingListResponse(items=items)


@router.patch("/settings/note-sheet-bindings/{user_id}", response_model=NoteSheetBindingItem)
def upsert_note_sheet_binding(
    user_id: str,
    payload: NoteSheetBindingUpdateRequest,
    admin: AdminUser,
    db: DbSession,
) -> NoteSheetBindingItem:
    target_user = db.query(User).filter(User.user_id == user_id).one_or_none()
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    binding = db.query(NoteSheetBinding).filter(NoteSheetBinding.user_id == target_user.id).one_or_none()
    before = (
        {
            "spreadsheet_id": binding.spreadsheet_id,
            "sheet_name": binding.sheet_name,
            "is_active": binding.is_active,
        }
        if binding
        else None
    )
    if binding is None:
        binding = NoteSheetBinding(
            user_id=target_user.id,
            spreadsheet_id=payload.spreadsheet_id or "",
            sheet_name=payload.sheet_name or "notes",
            is_active=payload.is_active if payload.is_active is not None else False,
        )
        db.add(binding)
    else:
        if payload.spreadsheet_id is not None:
            binding.spreadsheet_id = payload.spreadsheet_id
        if payload.sheet_name is not None:
            binding.sheet_name = payload.sheet_name or "notes"
        if payload.is_active is not None:
            binding.is_active = payload.is_active

    db.flush()
    after = {
        "spreadsheet_id": binding.spreadsheet_id,
        "sheet_name": binding.sheet_name,
        "is_active": binding.is_active,
    }
    create_audit_log(
        db,
        actor_user_id=admin.id,
        action="note_sheet_binding_update",
        target_type="users",
        target_id=target_user.user_id,
        before_json=before,
        after_json=after,
    )
    db.commit()
    db.refresh(binding)
    return NoteSheetBindingItem(
        user_id=target_user.user_id,
        display_name=target_user.display_name,
        spreadsheet_id=binding.spreadsheet_id,
        sheet_name=binding.sheet_name,
        is_active=binding.is_active,
    )


def get_single_lab(db: DbSession) -> Lab:
    lab = db.query(Lab).order_by(Lab.id.asc()).first()
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found.")
    return lab


def serialize_room(room: Room) -> RoomResponse:
    return RoomResponse(
        id=room.id,
        lab_id=room.lab_id,
        name=room.name,
        display_order=room.display_order,
        is_active=room.is_active,
    )
