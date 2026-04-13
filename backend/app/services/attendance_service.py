from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.constants import PresenceStatus, SessionCloseReason, UserRole
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.models.status_change import StatusChangeRecord
from app.models.user import UserRecord
from app.services.audit_service import create_audit_log
from app.store import Stores

ACTIVE_WORK_STATUSES = {
    PresenceStatus.ROOM.value,
    PresenceStatus.ON_CAMPUS.value,
    PresenceStatus.CLASS.value,
    PresenceStatus.SEMINAR.value,
    PresenceStatus.MEETING.value,
}

ALL_STATUSES = ACTIVE_WORK_STATUSES | {PresenceStatus.OFF_CAMPUS.value}


def resolve_target_user(stores: Stores, actor: UserRecord, target_user_id: str | None) -> UserRecord:
    if target_user_id is None or target_user_id == actor.user_id:
        return actor

    if actor.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another user.")

    target = stores.users.get_by_user_id(target_user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")
    if not target.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is inactive.")
    return target


def check_in(
    stores: Stores,
    *,
    actor: UserRecord,
    target: UserRecord,
    initial_status: str,
) -> PresenceRecord:
    validate_status(initial_status)
    if initial_status == PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check in with Off Campus status.",
        )

    presence = stores.presence.ensure(target.user_id)
    open_session = stores.sessions.get_open_session(target.user_id)

    if open_session is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already checked in.")
    if presence.current_status != PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current status must be Off Campus before check-in.",
        )

    now = datetime.now(timezone.utc)
    session = SessionRecord(
        id=str(uuid.uuid4()),
        user_id=target.user_id,
        check_in_at=now,
        check_out_at=None,
        duration_sec=None,
        close_reason=None,
        created_at=now,
        updated_at=now,
    )
    session = stores.sessions.add(session)

    from_status = presence.current_status
    presence = stores.presence.save(
        presence.model_copy(update={
            "current_status": initial_status,
            "current_session_id": session.id,
            "last_changed_at": now,
        })
    )

    stores.status_changes.append(StatusChangeRecord(
        id=str(uuid.uuid4()),
        user_id=target.user_id,
        session_id=session.id,
        from_status=from_status,
        to_status=initial_status,
        changed_at=now,
        changed_by=actor.user_id,
        source="web",
    ))
    create_audit_log(
        stores.audit,
        actor_user_id=actor.user_id,
        action="check_in",
        target_type="users",
        target_id=target.user_id,
        after_json={"status": presence.current_status, "session_id": session.id},
    )
    return presence


def check_out(
    stores: Stores,
    *,
    actor: UserRecord,
    target: UserRecord,
) -> PresenceRecord:
    presence = stores.presence.ensure(target.user_id)
    open_session = stores.sessions.get_open_session(target.user_id)
    if open_session is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active session to check out.")

    now = datetime.now(timezone.utc)
    check_in_at = normalize_datetime(open_session.check_in_at)
    if now < check_in_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out_at cannot be earlier than check_in_at.",
        )

    duration_sec = int((now - check_in_at).total_seconds())
    updated_session = stores.sessions.update(
        open_session.model_copy(update={
            "check_out_at": now,
            "duration_sec": duration_sec,
            "close_reason": SessionCloseReason.MANUAL_CHECKOUT.value,
        })
    )

    from_status = presence.current_status
    presence = stores.presence.save(
        presence.model_copy(update={
            "current_status": PresenceStatus.OFF_CAMPUS.value,
            "current_session_id": None,
            "last_changed_at": now,
        })
    )

    stores.status_changes.append(StatusChangeRecord(
        id=str(uuid.uuid4()),
        user_id=target.user_id,
        session_id=updated_session.id,
        from_status=from_status,
        to_status=PresenceStatus.OFF_CAMPUS.value,
        changed_at=now,
        changed_by=actor.user_id,
        source="web",
    ))
    create_audit_log(
        stores.audit,
        actor_user_id=actor.user_id,
        action="check_out",
        target_type="users",
        target_id=target.user_id,
        after_json={"status": presence.current_status, "session_id": updated_session.id},
    )
    return presence


def change_status(
    stores: Stores,
    *,
    actor: UserRecord,
    target: UserRecord,
    to_status: str,
) -> PresenceRecord:
    validate_status(to_status)
    if to_status == PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use check-out API to move to Off Campus.",
        )

    presence = stores.presence.ensure(target.user_id)
    open_session = stores.sessions.get_open_session(target.user_id)
    if open_session is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not checked in.")

    from_status = presence.current_status
    if from_status == to_status:
        return presence

    now = datetime.now(timezone.utc)
    presence = stores.presence.save(
        presence.model_copy(update={
            "current_status": to_status,
            "current_session_id": open_session.id,
            "last_changed_at": now,
        })
    )

    stores.status_changes.append(StatusChangeRecord(
        id=str(uuid.uuid4()),
        user_id=target.user_id,
        session_id=open_session.id,
        from_status=from_status,
        to_status=to_status,
        changed_at=now,
        changed_by=actor.user_id,
        source="web",
    ))
    create_audit_log(
        stores.audit,
        actor_user_id=actor.user_id,
        action="status_change",
        target_type="users",
        target_id=target.user_id,
        before_json={"status": from_status},
        after_json={"status": to_status, "session_id": open_session.id},
    )
    return presence


def patch_session_by_admin(
    stores: Stores,
    *,
    actor: UserRecord,
    session_obj: SessionRecord,
    reason: str,
    check_in_at: datetime | None,
    check_out_at_set: bool,
    check_out_at: datetime | None,
) -> SessionRecord:
    before = serialize_session(session_obj)

    updated = session_obj
    if check_in_at is not None:
        updated = updated.model_copy(update={"check_in_at": check_in_at})

    if check_out_at_set:
        if check_out_at is None and updated.check_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reopening a closed session is not supported.",
            )
        updated = updated.model_copy(update={"check_out_at": check_out_at})

    normalized_check_in = normalize_datetime(updated.check_in_at)
    normalized_check_out = normalize_datetime(updated.check_out_at) if updated.check_out_at else None
    if normalized_check_out is not None and normalized_check_out < normalized_check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out_at cannot be earlier than check_in_at.",
        )

    if updated.check_out_at is None:
        updated = updated.model_copy(update={"duration_sec": None, "close_reason": None})
    else:
        duration_sec = int((normalized_check_out - normalized_check_in).total_seconds())
        updated = updated.model_copy(update={
            "duration_sec": duration_sec,
            "close_reason": SessionCloseReason.ADMIN_CORRECTION.value,
        })

    presence = stores.presence.get(session_obj.user_id)
    if (
        presence is not None
        and presence.current_session_id == session_obj.id
        and updated.check_out_at is not None
        and presence.current_status != PresenceStatus.OFF_CAMPUS.value
    ):
        from_status = presence.current_status
        stores.presence.save(
            presence.model_copy(update={
                "current_status": PresenceStatus.OFF_CAMPUS.value,
                "current_session_id": None,
                "last_changed_at": normalized_check_out,
            })
        )
        stores.status_changes.append(StatusChangeRecord(
            id=str(uuid.uuid4()),
            user_id=session_obj.user_id,
            session_id=session_obj.id,
            from_status=from_status,
            to_status=PresenceStatus.OFF_CAMPUS.value,
            changed_at=normalized_check_out,
            changed_by=actor.user_id,
            source="admin_correction",
        ))

    updated = stores.sessions.update(updated)
    create_audit_log(
        stores.audit,
        actor_user_id=actor.user_id,
        action="session_patch",
        target_type="sessions",
        target_id=str(updated.id),
        before_json=before,
        after_json=serialize_session(updated),
        reason=reason,
    )
    return updated


def serialize_session(session_obj: SessionRecord) -> dict:
    return {
        "id": session_obj.id,
        "user_id": session_obj.user_id,
        "check_in_at": session_obj.check_in_at,
        "check_out_at": session_obj.check_out_at,
        "duration_sec": session_obj.duration_sec,
        "close_reason": session_obj.close_reason,
    }


def validate_status(value: str) -> None:
    if value not in ALL_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status value.")


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
