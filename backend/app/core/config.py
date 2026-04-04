from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Laboratory Presence Management"
    app_env: str = "development"
    api_prefix: str = "/api"
    app_base_url: str = "http://localhost:8088"
    database_url: str = "sqlite:///./data/app.db"
    session_secret_key: str = "dev-session-secret-change-me"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:8088"]
    )
    sqlalchemy_echo: bool = False
    auto_seed: bool = True
    notes_storage_mode: str = "file"
    notes_root_path: str = "./data/reports"
    backup_root_path: str = "./data/backups"
    backup_retention_count: int = 30
    allowed_subnets: Annotated[list[str], NoDecode] = Field(default_factory=list)
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/api/notes/google/connect/callback"
    google_oauth_success_redirect: str = "http://localhost:5173/notes"
    google_oauth_scopes: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/spreadsheets",
        ]
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("allowed_subnets", mode="before")
    @classmethod
    def parse_allowed_subnets(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [subnet.strip() for subnet in value.split(",") if subnet.strip()]

    @field_validator("google_oauth_scopes", mode="before")
    @classmethod
    def parse_google_scopes(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [scope.strip() for scope in value.split(",") if scope.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
