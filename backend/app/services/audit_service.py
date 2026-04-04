from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    session: Session,
    *,
    actor_user_id: int | None,
    action: str,
    target_type: str,
    target_id: str,
    before_json: dict | None = None,
    after_json: dict | None = None,
    reason: str | None = None,
) -> AuditLog:
    log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_json=normalize_json_value(before_json),
        after_json=normalize_json_value(after_json),
        reason=reason,
    )
    session.add(log)
    session.flush()
    return log


def normalize_json_value(value: object) -> object:
    if isinstance(value, dict):
        return {key: normalize_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_json_value(item) for item in value]
    if isinstance(value, tuple):
        return [normalize_json_value(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value
