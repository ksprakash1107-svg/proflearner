from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.db.session import async_session_factory
from app.storage.factory import get_storage_provider

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_liveness() -> dict:
    return {"status": "ok"}


@router.get("/health/ready")
async def health_readiness(response: Response) -> dict:
    checks = {
        "database": False,
        "pgvector": False,
        "storage": False,
    }

    # 1. Check database and pgvector
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = True

            sql = text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            result = await session.execute(sql)
            if result.scalar():
                checks["pgvector"] = True
    except Exception:
        checks["database"] = False
        checks["pgvector"] = False

    # 2. Check storage
    try:
        storage = get_storage_provider()
        checks["storage"] = await storage.check_ready()
    except Exception:
        checks["storage"] = False

    all_ready = checks["database"] and checks["pgvector"] and checks["storage"]
    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "checks": checks}

    return {"status": "ok", "checks": checks}
