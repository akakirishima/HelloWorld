from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.constants import UserRole
from app.db.sqlite_db import SqliteDb
from app.models.user import UserRecord
from app.store import Stores, make_stores


def get_stores(request: Request) -> Stores:
    root = Path(get_settings().data_root_path)
    sqlite_db: SqliteDb | None = getattr(request.app.state, "sqlite_db", None)
    return make_stores(root, sqlite_db=sqlite_db)


AppStores = Annotated[Stores, Depends(get_stores)]


def get_current_user(request: Request, stores: AppStores) -> UserRecord:
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    user = stores.users.get_by_user_id(str(user_id))
    if user is None or not user.is_active:
        request.session.clear()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    return user


CurrentUser = Annotated[UserRecord, Depends(get_current_user)]


def require_password_changed(user: CurrentUser) -> UserRecord:
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required before using this resource.",
        )
    return user


ActiveUser = Annotated[UserRecord, Depends(require_password_changed)]


def require_admin(user: ActiveUser) -> UserRecord:
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


AdminUser = Annotated[UserRecord, Depends(require_admin)]
