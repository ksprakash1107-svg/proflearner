from app.storage.base import StorageProvider


class FakeStorageProvider(StorageProvider):
    def __init__(self) -> None:
        self.store: dict[str, bytes] = {}
        self.content_types: dict[str, str] = {}

    async def put_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        self.store[key] = data
        self.content_types[key] = content_type
        return key

    async def get_object(self, key: str) -> bytes:
        if key not in self.store:
            raise FileNotFoundError(f"Object {key} not found in fake storage")
        return self.store[key]

    async def delete_object(self, key: str) -> None:
        self.store.pop(key, None)
        self.content_types.pop(key, None)

    async def generate_presigned_get_url(self, key: str, expires_in: int = 3600) -> str:
        return f"http://localhost:9000/proflearn/{key}?mock_token=1"

    async def check_ready(self) -> bool:
        return True
