import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role, verify_csrf
from app.db.enums import UserRole
from app.db.models.auth import User
from app.db.session import get_db
from app.schemas.course import CourseDTO, PaginatedCoursesDTO
from app.schemas.lecture import LectureDetailDTO, TutorAnswerDTO, TutorAskRequest
from app.schemas.student import (
    EnrollmentDTO,
    StudentDashboardDTO,
    StudentProfileDTO,
    StudentProfileUpdateRequest,
)
from app.services.lecture_service import lecture_service
from app.services.student_service import StudentService

router = APIRouter(prefix="/student", tags=["student"])
student_service = StudentService()

StudentUser = Annotated[User, Depends(require_role(UserRole.STUDENT))]


@router.get("/profile", response_model=StudentProfileDTO)
async def get_profile(
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> StudentProfileDTO:
    return await student_service.get_student_profile(session, current_user)


@router.patch(
    "/profile",
    response_model=StudentProfileDTO,
    dependencies=[Depends(verify_csrf)],
)
async def update_profile(
    data: StudentProfileUpdateRequest,
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> StudentProfileDTO:
    return await student_service.update_student_profile(session, current_user, data)


@router.get("/dashboard", response_model=StudentDashboardDTO)
async def get_dashboard(
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> StudentDashboardDTO:
    return await student_service.get_student_dashboard(session, current_user.id)


@router.get("/courses", response_model=PaginatedCoursesDTO)
async def list_courses(
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
    q: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedCoursesDTO:
    return await student_service.list_published_courses(
        session, q=q, subject=subject, page=page, page_size=page_size, student_id=current_user.id
    )


@router.get("/courses/{course_id}", response_model=CourseDTO)
async def get_course(
    course_id: uuid.UUID,
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> CourseDTO:
    return await student_service.get_student_course(session, course_id, current_user.id)


@router.post(
    "/courses/{course_id}/enroll",
    response_model=EnrollmentDTO,
    dependencies=[Depends(verify_csrf)],
)
async def enroll(
    course_id: uuid.UUID,
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> EnrollmentDTO:
    return await student_service.enroll_in_course(session, course_id, current_user.id)


@router.get("/enrollments", response_model=list[EnrollmentDTO])
async def get_enrollments(
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> list[EnrollmentDTO]:
    return await student_service.get_student_enrollments(session, current_user.id)


@router.get("/lectures/{lecture_id}", response_model=LectureDetailDTO)
async def get_student_lecture(
    lecture_id: uuid.UUID,
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> LectureDetailDTO:
    return await lecture_service.get_lecture(session=session, lecture_id=lecture_id)


@router.post(
    "/lectures/{lecture_id}/ask",
    response_model=TutorAnswerDTO,
    dependencies=[Depends(verify_csrf)],
)
async def ask_student_lecture_tutor(
    lecture_id: uuid.UUID,
    data: TutorAskRequest,
    current_user: StudentUser,
    session: AsyncSession = Depends(get_db),
) -> TutorAnswerDTO:
    return await lecture_service.ask_tutor(
        session=session,
        lecture_id=lecture_id,
        slide_number=data.slide_number,
        question=data.question,
    )

