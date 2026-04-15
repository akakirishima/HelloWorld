from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.sqlite_db import SqliteDb
from app.middleware.network_access import NetworkAccessMiddleware
from app.services.bootstrap_service import run_seed
from app.store import make_stores
from app.store.note_store import migrate_legacy_notes

settings = get_settings()


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

    yield

    # 終了時処理
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
