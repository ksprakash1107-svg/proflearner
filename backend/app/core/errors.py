from typing import Any

import structlog
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        http_status: int = status.HTTP_400_BAD_REQUEST,
        details: list[dict[str, Any]] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or []


class UnauthorizedError(AppError):
    def __init__(
        self,
        code: str = "NOT_AUTHENTICATED",
        message: str = "Please sign in to continue.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(
        self,
        code: str = "FORBIDDEN_ROLE",
        message: str = "You don't have access to this page.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_403_FORBIDDEN)


class NotFoundError(AppError):
    def __init__(
        self,
        code: str = "NOT_FOUND",
        message: str = "We couldn't find that item.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_404_NOT_FOUND)


class ConflictError(AppError):
    def __init__(
        self,
        code: str = "CONFLICT",
        message: str = "A conflict occurred with existing resources.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_409_CONFLICT)


class ValidationFailed(AppError):
    def __init__(
        self,
        message: str = "Validation failed.",
        details: list[dict[str, Any]] | None = None,
        code: str = "VALIDATION_ERROR",
    ):
        super().__init__(
            code=code,
            message=message,
            http_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class RateLimitedError(AppError):
    def __init__(
        self,
        code: str = "RATE_LIMITED",
        message: str = "Too many requests. Please slow down.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_429_TOO_MANY_REQUESTS)


class AIUnavailableError(AppError):
    def __init__(
        self,
        message: str = "The AI assistant is unavailable right now. Please try again.",
    ):
        super().__init__(
            code="AI_UNAVAILABLE",
            message=message,
            http_status=status.HTTP_502_BAD_GATEWAY,
        )


class BadRequestError(AppError):
    def __init__(
        self,
        code: str = "BAD_REQUEST",
        message: str = "Invalid request.",
    ):
        super().__init__(code=code, message=message, http_status=status.HTTP_400_BAD_REQUEST)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id,
            }
        },
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    details = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field = ".".join(str(item) for item in loc if item not in ("body", "query", "path"))
        details.append(
            {
                "field": field or "body",
                "issue": err.get("msg", "Invalid value"),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed for request data.",
                "details": details,
                "request_id": request_id,
            }
        },
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    logger = structlog.get_logger()
    logger.error("unhandled_exception", error=str(exc), exc_info=True, request_id=request_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Something went wrong. Reference: {request_id}",
                "details": [],
                "request_id": request_id,
            }
        },
    )
