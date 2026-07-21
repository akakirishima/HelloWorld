from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.core.constants import PresenceStatus, SessionCloseReason, UserRole
from app.models.presence_latest import PresenceRecord
from app.models.session import SessionRecord
from app.models.status_change import StatusChangeRecord
from app.models.user import UserRecord
from app.schemas.attendance import AttendanceSummaryItem
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
JST = ZoneInfo("Asia/Tokyo")


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


def build_weekly_attendance_summary(
    stores: Stores,
    *,
    now: datetime | None = None,
) -> list[AttendanceSummaryItem]:
    current_time = normalize_datetime(now or datetime.now(timezone.utc))
    today_start, today_end = get_jst_day_range(current_time)
    week_start, week_end = get_jst_week_range(current_time)

    local_week_start = week_start.astimezone(JST)
    day_ranges = [
        (
            (local_week_start + timedelta(days=i)).astimezone(timezone.utc),
            (local_week_start + timedelta(days=i + 1)).astimezone(timezone.utc),
        )
        for i in range(7)
    ]

    users = [
        user
        for user in stores.users.list_all()
        if user.role == UserRole.MEMBER.value and user.is_active
    ]
    totals = {
        user.user_id: {
            "display_name": user.display_name,
            "today_duration_sec": 0,
            "weekly_duration_sec": 0,
            "daily_durations_sec": [0] * 7,
        }
        for user in users
    }

    for session_obj in stores.sessions.list_overlapping(week_start, week_end, now=current_time):
        if session_obj.user_id not in totals:
            continue
        totals[session_obj.user_id]["weekly_duration_sec"] += clipped_duration_sec(
            session_obj,
            range_start=week_start,
            range_end=week_end,
            now=current_time,
        )
        totals[session_obj.user_id]["today_duration_sec"] += clipped_duration_sec(
            session_obj,
            range_start=today_start,
            range_end=today_end,
            now=current_time,
        )
        for day_idx, (d_start, d_end) in enumerate(day_ranges):
            totals[session_obj.user_id]["daily_durations_sec"][day_idx] += clipped_duration_sec(
                session_obj,
                range_start=d_start,
                range_end=d_end,
                now=current_time,
            )

    sorted_users = sorted(
        users,
        key=lambda user: (-totals[user.user_id]["weekly_duration_sec"], user.display_name),
    )
    return [
        AttendanceSummaryItem(
            user_id=user.user_id,
            display_name=totals[user.user_id]["display_name"],
            today_duration_sec=totals[user.user_id]["today_duration_sec"],
            weekly_duration_sec=totals[user.user_id]["weekly_duration_sec"],
            daily_durations_sec=totals[user.user_id]["daily_durations_sec"],
            rank=index + 1,
        )
        for index, user in enumerate(sorted_users)
    ]


def get_jst_day_range(now: datetime) -> tuple[datetime, datetime]:
    local_now = normalize_datetime(now).astimezone(JST)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    local_end = local_start + timedelta(days=1)
    return local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)


def get_jst_week_range(now: datetime) -> tuple[datetime, datetime]:
    local_now = normalize_datetime(now).astimezone(JST)
    local_start = (local_now - timedelta(days=local_now.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    local_end = local_start + timedelta(days=7)
    return local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc)


def clipped_duration_sec(
    session_obj: SessionRecord,
    *,
    range_start: datetime,
    range_end: datetime,
    now: datetime,
) -> int:
    check_in_at = normalize_datetime(session_obj.check_in_at)
    check_out_at = normalize_datetime(session_obj.check_out_at) if session_obj.check_out_at else now
    start_at = max(check_in_at, range_start)
    end_at = min(check_out_at, range_end)
    if end_at <= start_at:
        return 0
    return int((end_at - start_at).total_seconds())


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
