import hashlib
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings
from app.core.errors import BadRequestError, ValidationFailed

ph = PasswordHasher()

COMMON_PASSWORDS = {
    "password",
    "password123",
    "12345678",
    "qwertyuiop",
    "admin123",
    "letmein123",
    "welcome123",
    "changeme",
}


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, password)
    except (VerifyMismatchError, Exception):
        return False


def validate_password_policy(password: str, email: str = "") -> None:
    if len(password) < 10 or len(password) > 128:
        raise ValidationFailed(
            message="Password must be between 10 and 128 characters.",
            details=[
                {"field": "password", "issue": "Length must be between 10 and 128 characters"}
            ],
            code="WEAK_PASSWORD",
        )
    if not re.search(r"[A-Za-z]", password):
        raise ValidationFailed(
            message="Password must contain at least one letter.",
            details=[{"field": "password", "issue": "Must contain at least one letter"}],
            code="WEAK_PASSWORD",
        )
    if not re.search(r"\d", password):
        raise ValidationFailed(
            message="Password must contain at least one digit.",
            details=[{"field": "password", "issue": "Must contain at least one digit"}],
            code="WEAK_PASSWORD",
        )
    if email and password.lower() == email.lower():
        raise ValidationFailed(
            message="Password cannot be the same as your email address.",
            details=[{"field": "password", "issue": "Cannot equal email address"}],
            code="WEAK_PASSWORD",
        )
    if password.lower() in COMMON_PASSWORDS:
        raise ValidationFailed(
            message="This password is too common. Please choose a stronger password.",
            details=[{"field": "password", "issue": "Common password not allowed"}],
            code="WEAK_PASSWORD",
        )


def create_access_token(user_id: uuid.UUID, role: str, token_version: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.AUTH_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise BadRequestError(code="TOKEN_EXPIRED", message="Token has expired.") from None
    except Exception:
        raise BadRequestError(
            code="NOT_AUTHENTICATED", message="Invalid authentication token."
        ) from None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_token() -> tuple[str, str]:
    raw_token = secrets.token_urlsafe(32)
    return raw_token, hash_token(raw_token)


def generate_csrf_token() -> str:
    return secrets.token_hex(24)
