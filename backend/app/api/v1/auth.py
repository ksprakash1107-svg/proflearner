from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import clear_auth_cookies, get_current_user, set_auth_cookies, verify_csrf
from app.core.errors import UnauthorizedError
from app.db.models.auth import User
from app.db.session import get_db
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RegisterRequest,
    UserDTO,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()


@router.post(
    "/register",
    response_model=UserDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> UserDTO:
    user_dto, access_token, refresh_token, csrf_token = await auth_service.register(
        session=session, data=data, request=request
    )
    set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return user_dto


@router.post(
    "/login",
    response_model=UserDTO,
    dependencies=[Depends(verify_csrf)],
)
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> UserDTO:
    user_dto, access_token, refresh_token, csrf_token = await auth_service.login(
        session=session, email=data.email, password=data.password, request=request
    )
    set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return user_dto


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
    session: AsyncSession = Depends(get_db),
) -> None:
    await auth_service.logout(
        session=session, user=user, raw_refresh_token=refresh_token, request=request
    )
    clear_auth_cookies(response)


@router.post(
    "/refresh",
    response_model=UserDTO,
)
async def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
    session: AsyncSession = Depends(get_db),
) -> UserDTO:
    if not refresh_token:
        raise UnauthorizedError(
            code="REFRESH_TOKEN_INVALID",
            message="Your session expired. Please sign in again.",
        )
    user_dto, access_token, new_refresh_token, csrf_token = await auth_service.refresh(
        session=session, raw_refresh_token=refresh_token, request=request
    )
    set_auth_cookies(response, access_token, new_refresh_token, csrf_token)
    return user_dto


@router.get("/me", response_model=UserDTO)
async def get_me(user: User = Depends(get_current_user)) -> UserDTO:
    return auth_service.user_to_dto(user)


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(verify_csrf)],
)
async def request_password_reset(
    data: PasswordResetRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> dict:
    await auth_service.request_password_reset(session=session, email=data.email, request=request)
    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def confirm_password_reset(
    data: PasswordResetConfirmRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> None:
    await auth_service.confirm_password_reset(session=session, data=data, request=request)
    clear_auth_cookies(response)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    await auth_service.change_password(session=session, user=user, data=data, request=request)
