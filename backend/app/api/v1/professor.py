import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role, verify_csrf
from app.db.enums import UserRole
from app.db.models.auth import User
from app.db.session import get_db
from app.schemas.course import (
    CourseCreateRequest,
    CourseDTO,
    CourseUnitCreateRequest,
    CourseUnitDTO,
    CourseUnitUpdateRequest,
    CourseUpdateRequest,
    PaginatedCoursesDTO,
    ProfessorDashboardDTO,
    ProfessorProfileDTO,
    ProfessorProfileUpdateRequest,
)
from app.services.course_service import CourseService

router = APIRouter(prefix="/professor", tags=["professor"])
course_service = CourseService()

ProfessorUser = Annotated[User, Depends(require_role(UserRole.PROFESSOR))]


@router.get("/profile", response_model=ProfessorProfileDTO)
async def get_profile(
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> ProfessorProfileDTO:
    return await course_service.get_professor_profile(session, current_user)


@router.patch(
    "/profile",
    response_model=ProfessorProfileDTO,
    dependencies=[Depends(verify_csrf)],
)
async def update_profile(
    data: ProfessorProfileUpdateRequest,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> ProfessorProfileDTO:
    return await course_service.update_professor_profile(session, current_user, data)


@router.get("/dashboard", response_model=ProfessorDashboardDTO)
async def get_dashboard(
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> ProfessorDashboardDTO:
    return await course_service.get_professor_dashboard(session, current_user.id)


@router.get("/courses", response_model=PaginatedCoursesDTO)
async def list_courses(
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedCoursesDTO:
    return await course_service.list_professor_courses(
        session, current_user.id, status=status, page=page, page_size=page_size
    )


@router.post(
    "/courses",
    response_model=CourseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_course(
    data: CourseCreateRequest,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.create_course(session, current_user, data)


@router.get("/courses/{course_id}", response_model=CourseDTO)
async def get_course(
    course_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.get_professor_course(session, course_id, current_user.id)


@router.patch(
    "/courses/{course_id}",
    response_model=CourseDTO,
    dependencies=[Depends(verify_csrf)],
)
async def update_course(
    course_id: uuid.UUID,
    data: CourseUpdateRequest,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.update_course(session, course_id, current_user.id, data)


@router.delete(
    "/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_course(
    course_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> Response:
    await course_service.delete_course(session, course_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/courses/{course_id}/publish",
    response_model=CourseDTO,
    dependencies=[Depends(verify_csrf)],
)
async def publish_course(
    course_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.publish_course(session, course_id, current_user.id)


@router.post(
    "/courses/{course_id}/unpublish",
    response_model=CourseDTO,
    dependencies=[Depends(verify_csrf)],
)
async def unpublish_course(
    course_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.unpublish_course(session, course_id, current_user.id)


@router.post(
    "/courses/{course_id}/archive",
    response_model=CourseDTO,
    dependencies=[Depends(verify_csrf)],
)
async def archive_course(
    course_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await course_service.archive_course(session, course_id, current_user.id)


@router.post(
    "/courses/{course_id}/units",
    response_model=CourseUnitDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_unit(
    course_id: uuid.UUID,
    data: CourseUnitCreateRequest,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseUnitDTO:
    return await course_service.create_unit(session, course_id, current_user.id, data)


@router.patch(
    "/units/{unit_id}",
    response_model=CourseUnitDTO,
    dependencies=[Depends(verify_csrf)],
)
async def update_unit(
    unit_id: uuid.UUID,
    data: CourseUnitUpdateRequest,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> CourseUnitDTO:
    return await course_service.update_unit(session, unit_id, current_user.id, data)


@router.delete(
    "/units/{unit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_unit(
    unit_id: uuid.UUID,
    current_user: ProfessorUser,
    session: AsyncSession = Depends(get_db),
) -> Response:
    await course_service.delete_unit(session, unit_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
