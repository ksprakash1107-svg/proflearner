import uuid

import pytest

from app.core.errors import BadRequestError, ValidationFailed
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_policy,
    verify_password,
)


def test_password_hashing() -> None:
    raw = "Str0ngPassw0rd!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword1!", hashed) is False


def test_password_policy() -> None:
    # Valid
    validate_password_policy("ValidPass123!", "user@example.com")

    # Too short (<10)
    with pytest.raises(ValidationFailed) as exc:
        validate_password_policy("Short1!", "user@example.com")
    assert exc.value.code == "WEAK_PASSWORD"

    # No digit
    with pytest.raises(ValidationFailed) as exc:
        validate_password_policy("NoDigitsHere!", "user@example.com")
    assert exc.value.code == "WEAK_PASSWORD"

    # No letter
    with pytest.raises(ValidationFailed) as exc:
        validate_password_policy("123456789012", "user@example.com")
    assert exc.value.code == "WEAK_PASSWORD"

    # Same as email
    with pytest.raises(ValidationFailed) as exc:
        validate_password_policy("user@example.com", "user@example.com")
    assert exc.value.code == "WEAK_PASSWORD"


def test_jwt_access_token() -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, role="STUDENT", token_version=1)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["role"] == "STUDENT"
    assert payload["ver"] == 1


def test_jwt_invalid_token() -> None:
    with pytest.raises(BadRequestError):
        decode_access_token("not.a.valid.jwt.token")
