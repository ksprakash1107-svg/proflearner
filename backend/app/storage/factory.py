from functools import lru_cache

from app.core.config import get_settings
from app.storage.base import StorageProvider
from app.storage.fake import FakeStorageProvider
from app.storage.s3 import S3StorageProvider


@lru_cache
def get_storage_provider() -> StorageProvider:
    settings = get_settings()
    if settings.AI_PROVIDER == "fake" or settings.APP_ENV == "test":
        return FakeStorageProvider()
    try:
        return S3StorageProvider()
    except Exception:
        # Fallback to FakeStorageProvider if S3 config is unavailable in dev/test
        if settings.APP_ENV != "production":
            return FakeStorageProvider()
        raise
