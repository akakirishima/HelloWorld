from fastapi import APIRouter

from app.api.routes.attendance import router as attendance_router
from app.api.routes.auth import router as auth_router
from app.api.routes.calibration import router as calibration_router
from app.api.routes.health import router as health_router
from app.api.routes.notes import router as notes_router
from app.api.routes.presence import router as presence_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.settings import router as settings_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(attendance_router, tags=["attendance"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(calibration_router, tags=["calibration"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(notes_router, tags=["notes"])
api_router.include_router(presence_router, tags=["presence"])
api_router.include_router(sessions_router, tags=["sessions"])
api_router.include_router(settings_router, tags=["settings"])
api_router.include_router(users_router, tags=["users"])
