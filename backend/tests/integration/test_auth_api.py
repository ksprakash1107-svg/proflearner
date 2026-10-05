import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models.audit import AuditLog
from app.db.session import async_session_factory


@pytest.mark.asyncio
async def test_auth_registration_and_login_flow(client: AsyncClient) -> None:
    # 1. Register a professor
    prof_payload = {
        "email": "dr_curie@example.edu",
        "password": "Radioactivity123!",
        "full_name": "Marie Curie",
        "role": "PROFESSOR",
    }
    reg_res = await client.post("/api/v1/auth/register", json=prof_payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == "dr_curie@example.edu"
    assert user_data["role"] == "PROFESSOR"
    assert "access_token" in reg_res.cookies
    assert "refresh_token" in reg_res.cookies

    # 2. Reject duplicate email
    dup_res = await client.post("/api/v1/auth/register", json=prof_payload)
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"

    # 3. Reject ADMIN role
    admin_payload = {
        "email": "hacker@example.edu",
        "password": "HackerPassword1!",
        "full_name": "Bad Actor",
        "role": "ADMIN",
    }
    admin_res = await client.post("/api/v1/auth/register", json=admin_payload)
    assert admin_res.status_code == 422

    # 4. Reject weak password
    weak_payload = {
        "email": "weak@example.edu",
        "password": "weak",
        "full_name": "Weak Pass",
        "role": "STUDENT",
    }
    weak_res = await client.post("/api/v1/auth/register", json=weak_payload)
    assert weak_res.status_code == 422

    # 5. Access /auth/me with cookies
    me_res = await client.get("/api/v1/auth/me", cookies=reg_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "dr_curie@example.edu"
    assert me_res.json()["role"] == "PROFESSOR"
    assert me_res.json()["profile"]["default_teaching_profile"] is not None

    # 6. Logout
    logout_res = await client.post("/api/v1/auth/logout", cookies=reg_res.cookies)
    assert logout_res.status_code == 204

    # 7. Login with valid credentials
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "dr_curie@example.edu", "password": "Radioactivity123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies

    # 8. Login with invalid password
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dr_curie@example.edu", "password": "WrongPassword1!"},
    )
    assert bad_login.status_code == 401
    assert bad_login.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_account_lockout(client: AsyncClient) -> None:
    # Register student
    student_payload = {
        "email": "lockout_target@example.edu",
        "password": "CorrectPassword1!",
        "full_name": "Lockout Target",
        "role": "STUDENT",
    }
    await client.post("/api/v1/auth/register", json=student_payload)

    # 5 failed login attempts
    for _ in range(5):
        _ = await client.post(
            "/api/v1/auth/login",
            json={"email": "lockout_target@example.edu", "password": "WrongPassword1!"},
        )

    # 5th or 6th attempt should return 403 ACCOUNT_LOCKED
    lockout_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "lockout_target@example.edu", "password": "WrongPassword1!"},
    )
    assert lockout_res.status_code == 403
    assert lockout_res.json()["error"]["code"] == "ACCOUNT_LOCKED"


@pytest.mark.asyncio
async def test_auth_refresh_token_rotation_and_reuse_detection(client: AsyncClient) -> None:
    user_payload = {
        "email": "rotator@example.edu",
        "password": "ValidPassword123!",
        "full_name": "Token Rotator",
        "role": "STUDENT",
    }
    reg_res = await client.post("/api/v1/auth/register", json=user_payload)
    old_refresh = reg_res.cookies.get("refresh_token")
    assert old_refresh is not None

    # Rotate refresh token
    refresh_res_1 = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert refresh_res_1.status_code == 200
    new_refresh = refresh_res_1.cookies.get("refresh_token")
    assert new_refresh is not None
    assert new_refresh != old_refresh

    # Reuse detection: use old_refresh again
    reuse_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert reuse_res.status_code == 401
    assert reuse_res.json()["error"]["code"] == "REFRESH_TOKEN_INVALID"

    # Because reuse was detected, the whole family is revoked, so new_refresh also fails!
    reuse_res_2 = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": new_refresh},
    )
    assert reuse_res_2.status_code == 401
    assert reuse_res_2.json()["error"]["code"] == "REFRESH_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_password_change_and_reset(client: AsyncClient) -> None:
    email = "passchange@example.edu"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "OriginalPass123!",
            "full_name": "Password Changer",
            "role": "STUDENT",
        },
    )
    cookies = reg_res.cookies

    # 1. Change password with wrong current password -> 400
    bad_change = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPass123!", "new_password": "NewValidPass123!"},
        cookies=cookies,
    )
    assert bad_change.status_code == 400
    assert bad_change.json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"

    # 2. Change password with correct current password -> 204
    good_change = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OriginalPass123!", "new_password": "NewValidPass123!"},
        cookies=cookies,
    )
    assert good_change.status_code == 204

    # 3. Old password fails
    fail_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "OriginalPass123!"},
    )
    assert fail_login.status_code == 401

    # 4. New password succeeds
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "NewValidPass123!"},
    )
    assert login_res.status_code == 200

    # 5. Password reset request
    reset_req = await client.post(
        "/api/v1/auth/password-reset/request",
        json={"email": email},
    )
    assert reset_req.status_code == 202

    # Check that audit log recorded the action
    async with async_session_factory() as session:
        logs = await session.execute(select(AuditLog).where(AuditLog.action == "PASSWORD_CHANGED"))
        assert len(logs.scalars().all()) >= 1
