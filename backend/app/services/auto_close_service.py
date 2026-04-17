"""
毎朝4時 JST に未クローズのセッションを自動で帰宅扱いにするサービス。
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.core.constants import PresenceStatus, SessionCloseReason
from app.services.audit_service import create_audit_log
from app.store import Stores

logger = logging.getLogger(__name__)


def auto_close_stale_sessions(stores: Stores) -> int:
    """
    check_out_at が NULL のセッションを現在時刻でクローズする。
    presence も OFF_CAMPUS に更新する。

    Returns:
        クローズしたセッション数
    """
    now = datetime.now(timezone.utc)
    open_sessions = [s for s in stores.sessions.list_all() if s.check_out_at is None]

    count = 0
    for session in open_sessions:
        check_in = session.check_in_at
        if check_in.tzinfo is None:
            check_in = check_in.replace(tzinfo=timezone.utc)
        else:
            check_in = check_in.astimezone(timezone.utc)

        if now < check_in:
            # check_in が未来（データ不整合）はスキップ
            continue

        duration_sec = int((now - check_in).total_seconds())
        stores.sessions.update(
            session.model_copy(update={
                "check_out_at": now,
                "duration_sec": duration_sec,
                "close_reason": SessionCloseReason.AUTO_CLOSE_DAILY.value,
            })
        )

        # presence を OFF_CAMPUS に戻す
        presence = stores.presence.get(session.user_id)
        if (
            presence is not None
            and presence.current_session_id == session.id
            and presence.current_status != PresenceStatus.OFF_CAMPUS.value
        ):
            stores.presence.save(
                presence.model_copy(update={
                    "current_status": PresenceStatus.OFF_CAMPUS.value,
                    "current_session_id": None,
                    "last_changed_at": now,
                })
            )

        create_audit_log(
            stores.audit,
            actor_user_id="system",
            action="auto_close_session",
            target_type="sessions",
            target_id=str(session.id),
            after_json={
                "close_reason": SessionCloseReason.AUTO_CLOSE_DAILY.value,
                "check_out_at": now.isoformat(),
                "duration_sec": duration_sec,
            },
        )
        logger.info("auto_close: closed session %s for user %s", session.id, session.user_id)
        count += 1

    if count:
        logger.info("auto_close: closed %d stale session(s) at 4 AM JST", count)
    return count
