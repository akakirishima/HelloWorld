import asyncio
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
from app.services.bootstrap_service import run_seed

settings = get_settings()


async def _daily_purge(sqlite_db: SqliteDb) -> None:
    while True:
        await asyncio.sleep(86400)  # 24時間ごと
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        sqlite_db.purge_old_records(cutoff)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時処理
    sqlite_db = SqliteDb(Path(settings.sqlite_path))
    app.state.sqlite_db = sqlite_db

    # 起動時に14日超えレコードを即時削除
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    sqlite_db.purge_old_records(cutoff)

    # 毎日定期クリーンアップタスク
    purge_task = asyncio.create_task(_daily_purge(sqlite_db))

    if settings.auto_seed:
        run_seed(Path(settings.data_root_path))

    yield

    # 終了時処理
    purge_task.cancel()
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
