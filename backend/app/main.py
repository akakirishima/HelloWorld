import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.sqlite_db import SqliteDb
from app.middleware.network_access import NetworkAccessMiddleware
from app.services.auto_close_service import auto_close_stale_sessions
from app.services.bootstrap_service import run_seed
from app.store import make_stores
from app.store.note_store import migrate_legacy_notes

logger = logging.getLogger(__name__)
settings = get_settings()

_JST = timezone(timedelta(hours=9))


async def _daily_auto_close_loop(app: FastAPI) -> None:
    """毎日4時 JST に未クローズセッションを自動締め処理するバックグラウンドタスク。"""
    while True:
        now = datetime.now(_JST)
        target = now.replace(hour=4, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
        wait_sec = (target - now).total_seconds()
        logger.info("auto_close: next run in %.0f seconds (at %s JST)", wait_sec, target.isoformat())
        await asyncio.sleep(wait_sec)

        try:
            sqlite_db = app.state.sqlite_db
            stores = make_stores(Path(settings.data_root_path), sqlite_db=sqlite_db)
            count = auto_close_stale_sessions(stores)
            logger.info("auto_close: closed %d session(s)", count)
        except Exception:
            logger.exception("auto_close: unexpected error during daily auto-close")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時処理
    sqlite_db = SqliteDb(Path(settings.sqlite_path))
    app.state.sqlite_db = sqlite_db

    # 既存ファイルがある場合だけ SQLite へ移行する
    data_root = Path(settings.data_root_path)
    stores = make_stores(data_root, sqlite_db=sqlite_db)
    stores.rooms.migrate_from_json_if_empty()
    stores.users.migrate_from_json_if_empty()
    stores.presence.migrate_from_json_if_empty()
    stores.sessions.migrate_from_csv_if_empty()
    stores.status_changes.migrate_from_csv_if_empty()
    stores.audit.migrate_from_csv_if_empty()
    migrate_legacy_notes(data_root, sqlite_db)

    if settings.auto_seed:
        run_seed(
            data_root,
            Path(settings.contact_time_root_path),
            sqlite_db=sqlite_db,
        )

    auto_close_task = asyncio.create_task(_daily_auto_close_loop(app))

    yield

    # 終了時処理
    auto_close_task.cancel()
    try:
        await auto_close_task
    except asyncio.CancelledError:
        pass
    sqlite_db.close()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key,
    same_site="lax",
    https_only=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(NetworkAccessMiddleware)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Laboratory Presence Management API"}
