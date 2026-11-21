from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_url: str = "postgresql+psycopg2://postgres:password@localhost:5432/postgres"
    db_username: str = "postgres"
    db_password: str = ""

    jwt_secret: str = "change-me-in-production-use-at-least-64-chars-secret-key-here"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440  # 24 hours

    # Build the final connection string from parts if DB_URL not given
    @property
    def database_url(self) -> str:
        return self.db_url


settings = Settings()
