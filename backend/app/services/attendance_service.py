from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.core.constants import PresenceStatus, SessionCloseReason, UserRole
from app.models.presence_latest import PresenceLatest
from app.models.session import Session
from app.models.status_change import StatusChange
from app.models.user import User
from app.services.audit_service import create_audit_log

ACTIVE_WORK_STATUSES = {
    PresenceStatus.ROOM.value,
    PresenceStatus.ON_CAMPUS.value,
    PresenceStatus.CLASS.value,
    PresenceStatus.SEMINAR.value,
    PresenceStatus.MEETING.value,
}

ALL_STATUSES = ACTIVE_WORK_STATUSES | {PresenceStatus.OFF_CAMPUS.value}


def resolve_target_user(db: DbSession, actor: User, target_user_id: str | None) -> User:
    if target_user_id is None or target_user_id == actor.user_id:
        return actor

    if actor.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another user.")

    target = db.query(User).filter(User.user_id == target_user_id).one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")
    if not target.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is inactive.")
    return target


def ensure_presence(db: DbSession, user: User) -> PresenceLatest:
    if user.presence is not None:
        return user.presence

    presence = PresenceLatest(
        user_id=user.id,
        current_status=PresenceStatus.OFF_CAMPUS.value,
        current_session_id=None,
        last_changed_at=datetime.now(timezone.utc),
    )
    db.add(presence)
    db.flush()
    return presence


def get_open_session(db: DbSession, user: User) -> Session | None:
    return (
        db.query(Session)
        .filter(Session.user_id == user.id, Session.check_out_at.is_(None))
        .order_by(Session.check_in_at.desc())
        .first()
    )


def check_in(
    db: DbSession,
    *,
    actor: User,
    target: User,
    initial_status: str,
) -> PresenceLatest:
    validate_status(initial_status)
    if initial_status == PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check in with Off Campus status.",
        )

    presence = ensure_presence(db, target)
    open_session = get_open_session(db, target)

    if open_session is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already checked in.")
    if presence.current_status != PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current status must be Off Campus before check-in.",
        )

    now = datetime.now(timezone.utc)
    session = Session(
        user_id=target.id,
        check_in_at=now,
        check_out_at=None,
        duration_sec=None,
        close_reason=None,
    )
    db.add(session)
    db.flush()

    from_status = presence.current_status
    presence.current_status = initial_status
    presence.current_session_id = session.id
    presence.last_changed_at = now

    db.add(
        StatusChange(
            user_id=target.id,
            session_id=session.id,
            from_status=from_status,
            to_status=initial_status,
            changed_at=now,
            changed_by=actor.id,
            source="web",
        )
    )
    create_audit_log(
        db,
        actor_user_id=actor.id,
        action="check_in",
        target_type="users",
        target_id=target.user_id,
        after_json={"status": presence.current_status, "session_id": session.id},
    )
    db.commit()
    db.refresh(target)
    return target.presence


def check_out(
    db: DbSession,
    *,
    actor: User,
    target: User,
) -> PresenceLatest:
    presence = ensure_presence(db, target)
    open_session = get_open_session(db, target)
    if open_session is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active session to check out.")

    now = datetime.now(timezone.utc)
    check_in_at = normalize_datetime(open_session.check_in_at)
    if now < check_in_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out_at cannot be earlier than check_in_at.",
        )

    open_session.check_out_at = now
    open_session.duration_sec = int((now - check_in_at).total_seconds())
    open_session.close_reason = SessionCloseReason.MANUAL_CHECKOUT.value

    from_status = presence.current_status
    presence.current_status = PresenceStatus.OFF_CAMPUS.value
    presence.current_session_id = None
    presence.last_changed_at = now

    db.add(
        StatusChange(
            user_id=target.id,
            session_id=open_session.id,
            from_status=from_status,
            to_status=PresenceStatus.OFF_CAMPUS.value,
            changed_at=now,
            changed_by=actor.id,
            source="web",
        )
    )
    create_audit_log(
        db,
        actor_user_id=actor.id,
        action="check_out",
        target_type="users",
        target_id=target.user_id,
        after_json={"status": presence.current_status, "session_id": open_session.id},
    )
    db.commit()
    db.refresh(target)
    return target.presence


def change_status(
    db: DbSession,
    *,
    actor: User,
    target: User,
    to_status: str,
) -> PresenceLatest:
    validate_status(to_status)
    if to_status == PresenceStatus.OFF_CAMPUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use check-out API to move to Off Campus.",
        )

    presence = ensure_presence(db, target)
    open_session = get_open_session(db, target)
    if open_session is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not checked in.")

    from_status = presence.current_status
    if from_status == to_status:
        return presence

    now = datetime.now(timezone.utc)
    presence.current_status = to_status
    presence.current_session_id = open_session.id
    presence.last_changed_at = now

    db.add(
        StatusChange(
            user_id=target.id,
            session_id=open_session.id,
            from_status=from_status,
            to_status=to_status,
            changed_at=now,
            changed_by=actor.id,
            source="web",
        )
    )
    create_audit_log(
        db,
        actor_user_id=actor.id,
        action="status_change",
        target_type="users",
        target_id=target.user_id,
        before_json={"status": from_status},
        after_json={"status": to_status, "session_id": open_session.id},
    )
    db.commit()
    db.refresh(target)
    return target.presence


def patch_session_by_admin(
    db: DbSession,
    *,
    actor: User,
    session_obj: Session,
    reason: str,
    check_in_at: datetime | None,
    check_out_at_set: bool,
    check_out_at: datetime | None,
) -> Session:
    before = serialize_session(session_obj)

    if check_in_at is not None:
        session_obj.check_in_at = check_in_at

    if check_out_at_set:
        if check_out_at is None and session_obj.check_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reopening a closed session is not supported.",
            )
        session_obj.check_out_at = check_out_at

    normalized_check_in = normalize_datetime(session_obj.check_in_at)
    normalized_check_out = normalize_datetime(session_obj.check_out_at) if session_obj.check_out_at else None
    if normalized_check_out is not None and normalized_check_out < normalized_check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out_at cannot be earlier than check_in_at.",
        )

    if session_obj.check_out_at is None:
        session_obj.duration_sec = None
        session_obj.close_reason = None
    else:
        session_obj.duration_sec = int((normalized_check_out - normalized_check_in).total_seconds())
        session_obj.close_reason = SessionCloseReason.ADMIN_CORRECTION.value

    target = session_obj.user
    presence = ensure_presence(db, target)
    if (
        presence.current_session_id == session_obj.id
        and session_obj.check_out_at is not None
        and presence.current_status != PresenceStatus.OFF_CAMPUS.value
    ):
        from_status = presence.current_status
        presence.current_status = PresenceStatus.OFF_CAMPUS.value
        presence.current_session_id = None
        presence.last_changed_at = normalized_check_out
        db.add(
            StatusChange(
                user_id=target.id,
                session_id=session_obj.id,
                from_status=from_status,
                to_status=PresenceStatus.OFF_CAMPUS.value,
                changed_at=normalized_check_out,
                changed_by=actor.id,
                source="admin_correction",
            )
        )

    db.flush()
    create_audit_log(
        db,
        actor_user_id=actor.id,
        action="session_patch",
        target_type="sessions",
        target_id=str(session_obj.id),
        before_json=before,
        after_json=serialize_session(session_obj),
        reason=reason,
    )
    db.commit()
    db.refresh(session_obj)
    return session_obj


def serialize_session(session_obj: Session) -> dict:
    return {
        "id": session_obj.id,
        "user_id": session_obj.user.user_id if session_obj.user else None,
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
