from typing import Protocol, runtime_checkable


@runtime_checkable
class StorageProvider(Protocol):
    async def put_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str: ...

    async def get_object(self, key: str) -> bytes: ...

    async def delete_object(self, key: str) -> None: ...

    async def generate_presigned_get_url(self, key: str, expires_in: int = 3600) -> str: ...

    async def check_ready(self) -> bool: ...
