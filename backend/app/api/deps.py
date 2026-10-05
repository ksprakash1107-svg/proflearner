import uuid
from collections.abc import Callable

from fastapi import Cookie, Depends, Header, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.enums import UserRole
from app.db.models.auth import User
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    settings = get_settings()
    domain = settings.COOKIE_DOMAIN or None

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
        domain=domain,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 86400,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",
        domain=domain,
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 86400,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
        domain=domain,
    )


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    domain = settings.COOKIE_DOMAIN or None

    response.delete_cookie(key="access_token", path="/", domain=domain)
    response.delete_cookie(key="refresh_token", path="/api/v1/auth", domain=domain)
    response.delete_cookie(key="csrf_token", path="/", domain=domain)


async def verify_csrf(request: Request) -> None:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    csrf_cookie = request.cookies.get("csrf_token")
    if not csrf_cookie:
        # If authenticated via cookies but no csrf_token cookie present
        if request.cookies.get("access_token") or request.cookies.get("refresh_token"):
            raise ForbiddenError(
                code="CSRF_FAILED", message="Something went wrong. Please refresh and try again."
            )
        return

    header_csrf = request.headers.get("x-csrf-token")
    if not header_csrf or header_csrf != csrf_cookie:
        raise ForbiddenError(
            code="CSRF_FAILED", message="Something went wrong. Please refresh and try again."
        )


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_db),
    access_token_cookie: str | None = Cookie(default=None, alias="access_token"),
    auth_credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    authorization: str | None = Header(default=None),
) -> User:
    token = None
    if auth_credentials:
        token = auth_credentials.credentials
    elif access_token_cookie:
        token = access_token_cookie
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()

    if not token:
        raise UnauthorizedError(code="NOT_AUTHENTICATED", message="Please sign in to continue.")

    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    token_ver = payload.get("ver")

    if not user_id_str:
        raise UnauthorizedError(code="NOT_AUTHENTICATED", message="Please sign in to continue.")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError(
            code="NOT_AUTHENTICATED", message="Please sign in to continue."
        ) from None

    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.professor_profile), selectinload(User.student_profile))
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError(code="NOT_AUTHENTICATED", message="Please sign in to continue.")

    if not user.is_active:
        raise ForbiddenError(
            code="ACCOUNT_DEACTIVATED",
            message="This account has been deactivated. Contact support.",
        )

    if user.token_version != token_ver:
        raise UnauthorizedError(code="TOKEN_EXPIRED", message="Please sign in to continue.")

    return user


def require_role(*roles: UserRole | str) -> Callable:
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        allowed = [r.value if isinstance(r, UserRole) else r for r in roles]
        if user.role not in allowed:
            raise ForbiddenError(
                code="FORBIDDEN_ROLE", message="You don't have access to this page."
            )
        return user

    return role_checker
