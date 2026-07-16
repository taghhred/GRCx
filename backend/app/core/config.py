from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    grcx_env: Literal["development", "test", "production"] = "development"
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = (
        "http://localhost:5174,http://localhost:5173,"
        "http://127.0.0.1:5174,http://127.0.0.1:5173"
    )
    database_url: str = (
        "postgresql+psycopg://grcx:grcx_local_dev_change_me@localhost:5432/grcx"
    )
    # SQLite fallback for zero-deps local bring-up / tests
    use_sqlite: bool = False
    sqlite_path: str = "./grcx_local.db"

    ai_provider: Literal["stub", "local_http", "raqeeb", "imtithal"] = "stub"
    # Local default; Docker overrides via compose to http://ai:8090
    ai_service_url: str = "http://127.0.0.1:8001"
    # Shared secret for backend → AI service (header X-GRCx-AI-Token)
    ai_service_token: str = ""
    local_ai_base_url: str = "http://127.0.0.1:11434"
    local_ai_model: str = "grcx-local"
    ai_request_timeout_seconds: float = 120.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.use_sqlite:
            return f"sqlite:///{self.sqlite_path}"
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
