import asyncio

import boto3
from botocore.config import Config

from app.core.config import get_settings
from app.storage.base import StorageProvider


class S3StorageProvider(StorageProvider):
    def __init__(self) -> None:
        self.settings = get_settings()
        config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if self.settings.STORAGE_FORCE_PATH_STYLE else "auto"},
        )
        self.client = boto3.client(
            "s3",
            endpoint_url=self.settings.STORAGE_ENDPOINT,
            region_name=self.settings.STORAGE_REGION,
            aws_access_key_id=self.settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=self.settings.STORAGE_SECRET_KEY,
            config=config,
        )
        # Client configured with public endpoint for generating presigned URLs reachable by browsers
        self.public_client = boto3.client(
            "s3",
            endpoint_url=self.settings.STORAGE_PUBLIC_ENDPOINT,
            region_name=self.settings.STORAGE_REGION,
            aws_access_key_id=self.settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=self.settings.STORAGE_SECRET_KEY,
            config=config,
        )
        self.bucket = self.settings.STORAGE_BUCKET

    async def put_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        def _put() -> None:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )

        await asyncio.to_thread(_put)
        return key

    async def get_object(self, key: str) -> bytes:
        def _get() -> bytes:
            resp = self.client.get_object(Bucket=self.bucket, Key=key)
            return resp["Body"].read()

        return await asyncio.to_thread(_get)

    async def delete_object(self, key: str) -> None:
        def _delete() -> None:
            self.client.delete_object(Bucket=self.bucket, Key=key)

        await asyncio.to_thread(_delete)

    async def generate_presigned_get_url(self, key: str, expires_in: int = 3600) -> str:
        def _gen() -> str:
            return self.public_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )

        return await asyncio.to_thread(_gen)

    async def check_ready(self) -> bool:
        def _check() -> bool:
            try:
                self.client.head_bucket(Bucket=self.bucket)
                return True
            except Exception:
                return False

        return await asyncio.to_thread(_check)
