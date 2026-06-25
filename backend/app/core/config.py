from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Crypto Analysis"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crypto_analysis"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8010,http://127.0.0.1:8010"
    alert_threshold_usd: float = 100000
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    jwt_secret_key: str = "change-me-local-dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 30
    password_reset_minutes: int = 15
    auth_rate_limit_window_seconds: int = 300
    auth_register_max_attempts: int = 5
    auth_login_max_failures: int = 5
    auth_lockout_minutes: int = 15

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
