from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.professor import router as professor_router
from app.api.v1.student import router as student_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(professor_router)
api_v1_router.include_router(student_router)


@api_v1_router.get("/ping")
async def ping() -> dict:
    return {"message": "pong"}
