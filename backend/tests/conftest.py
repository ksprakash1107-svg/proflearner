from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import async_session_factory, engine
from app.main import app

settings = get_settings()
settings.APP_ENV = "test"
settings.AI_PROVIDER = "fake"


class CsrfAwareClient(AsyncClient):
    """Test client that automatically attaches X-CSRF-Token header if csrf_token cookie exists."""

    async def request(self, method: str, url: str, **kwargs: Any) -> Response:
        csrf_val = None
        for cookie in self.cookies.jar:
            if cookie.name == "csrf_token":
                csrf_val = cookie.value

        req_cookies = kwargs.get("cookies")
        if req_cookies is not None:
            if hasattr(req_cookies, "get"):
                c_val = req_cookies.get("csrf_token")
                if c_val:
                    csrf_val = c_val
            elif hasattr(req_cookies, "jar"):
                for c in req_cookies.jar:
                    if c.name == "csrf_token":
                        csrf_val = c.value

        if csrf_val and method.upper() not in ("GET", "HEAD", "OPTIONS"):
            headers = kwargs.get("headers")
            if headers is None:
                headers = {}
            if isinstance(headers, dict) and "X-CSRF-Token" not in headers:
                headers = dict(headers)
                headers["X-CSRF-Token"] = csrf_val
                kwargs["headers"] = headers

        return await super().request(method, url, **kwargs)


@pytest.fixture(autouse=True)
async def clean_database() -> AsyncGenerator[None, None]:
    async with async_session_factory() as session:
        await session.execute(
            text(
                "TRUNCATE TABLE refresh_tokens, password_reset_tokens, "
                "professor_profiles, student_profiles, audit_logs, "
                "lectures, enrollments, course_units, courses, users CASCADE;"
            )
        )
        await session.commit()
    yield
    await engine.dispose()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with CsrfAwareClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
