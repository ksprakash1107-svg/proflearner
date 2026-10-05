from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: Literal["development", "test", "production"] = "development"
    APP_NAME: str = "ProfLearn"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+asyncpg://proflearn:proflearn@localhost:5432/proflearn"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10

    AUTH_SECRET: str = "change-me-to-a-random-string-of-at-least-32-characters"
    ACCESS_TOKEN_TTL_MINUTES: int = 30
    REFRESH_TOKEN_TTL_DAYS: int = 7
    COOKIE_SECURE: bool = False
    COOKIE_DOMAIN: str = ""
    CORS_ALLOWED_ORIGINS: list[str] | str = ["http://localhost:3000"]
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    AI_PROVIDER: Literal["openai", "fake"] = "fake"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    LLM_MODEL_SMALL: str = "gpt-4.1-mini"
    LLM_MODEL_MEDIUM: str = "gpt-4.1-mini"
    LLM_MODEL_LARGE: str = "gpt-4.1"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    TTS_MODEL: str = "gpt-4o-mini-tts"
    TTS_DEFAULT_VOICE: str = "alloy"
    AI_PRICE_TABLE_JSON: str = '{"gpt-4.1-mini":{"in":0.00000015,"out":0.0000006}}'
    AI_REQUEST_TIMEOUT_SECONDS: int = 60
    AI_LOG_PAYLOADS: bool = False

    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_BUCKET: str = "proflearn"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_FORCE_PATH_STYLE: bool = True

    AUDIO_URL_TTL_SECONDS: int = 3600
    MAX_UPLOAD_MB: int = 25
    MAX_PDF_PAGES: int = 300
    MAX_DOCUMENTS_PER_COURSE: int = 50
    PDF_PROCESS_TIMEOUT_SECONDS: int = 180

    RAG_TOP_K: int = 8
    RAG_MIN_SCORE: float = 0.25
    QA_CONTEXT_MAX_TOKENS: int = 7000

    STUDENT_QUESTIONS_PER_HOUR: int = 20
    STUDENT_QUESTIONS_PER_DAY: int = 100
    MAX_LECTURE_GENERATIONS_PER_DAY: int = 10
    MIN_SLIDES: int = 8
    MAX_SLIDES: int = 40
    REQUIRE_AUDIO_FOR_PUBLISH: bool = True

    WORKER_CONCURRENCY: int = 2
    WORKER_POLL_INTERVAL_SECONDS: int = 2

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@proflearn.local"
    SMTP_TLS: bool = False

    ADMIN_SEED_EMAIL: str = "admin@example.edu"
    ADMIN_SEED_PASSWORD: str = "ChangeMe123!"

    BACKEND_INTERNAL_URL: str = "http://localhost:8000"
    NEXT_PUBLIC_API_URL: str = "/api/v1"
    NEXT_PUBLIC_APP_NAME: str = "ProfLearn"

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore[return-value]
        raise ValueError(v)

    @field_validator("AUTH_SECRET")
    @classmethod
    def validate_auth_secret(cls, v: str, info) -> str:
        # In non-dev environments, auth secret must be >= 32 characters (§27.1)
        if len(v) < 32:
            raise ValueError("AUTH_SECRET must be at least 32 characters long.")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
