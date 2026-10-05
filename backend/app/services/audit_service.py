import hashlib
import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit import AuditLog
from app.db.models.auth import User


class AuditService:
    @staticmethod
    async def record(
        session: AsyncSession,
        action: str,
        actor: User | None = None,
        resource_type: str | None = None,
        resource_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
        request: Request | None = None,
    ) -> AuditLog:
        ip_address = None
        user_agent = None
        request_id = None

        if request is not None:
            # Client IP
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                ip_address = forwarded.split(",")[0].strip()
            elif request.client:
                ip_address = request.client.host

            user_agent = request.headers.get("user-agent")
            request_id = getattr(request.state, "request_id", None)

        actor_user_id = actor.id if actor else None
        actor_role = actor.role if actor else None

        audit_entry = AuditLog(
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent[:300] if user_agent else None,
            request_id=request_id,
        )
        session.add(audit_entry)
        return audit_entry

    @staticmethod
    def hash_email(email: str) -> str:
        return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()
