from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timezone

from app.models.audit_log import AuditLogRecord
from app.store.audit_store import AuditStore


def create_audit_log(
    audit: AuditStore,
    *,
    actor_user_id: str | None,
    action: str,
    target_type: str,
    target_id: str,
    before_json: dict | None = None,
    after_json: dict | None = None,
    reason: str | None = None,
) -> AuditLogRecord:
    record = AuditLogRecord(
        id=str(uuid.uuid4()),
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_json=json.dumps(normalize_json_value(before_json), ensure_ascii=False) if before_json else None,
        after_json=json.dumps(normalize_json_value(after_json), ensure_ascii=False) if after_json else None,
        reason=reason,
        created_at=datetime.now(timezone.utc),
    )
    audit.append(record)
    return record


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
