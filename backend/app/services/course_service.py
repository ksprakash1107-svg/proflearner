import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConflictError, NotFoundError
from app.db.enums import CourseStatus, EnrollmentStatus, LectureStatus
from app.db.models.auth import ProfessorProfile, User
from app.db.models.course import Course, CourseUnit, Enrollment
from app.db.models.lecture import Lecture
from app.schemas.auth import UserDTO
from app.schemas.course import (
    CourseCreateRequest,
    CourseDTO,
    CourseSummaryDTO,
    CourseUnitCreateRequest,
    CourseUnitDTO,
    CourseUnitUpdateRequest,
    CourseUpdateRequest,
    LectureSummaryDTO,
    PaginatedCoursesDTO,
    ProfessorDashboardDTO,
    ProfessorProfileDTO,
    ProfessorProfileUpdateRequest,
)


class CourseService:
    async def get_professor_profile(
        self, session: AsyncSession, professor: User
    ) -> ProfessorProfileDTO:
        stmt = select(ProfessorProfile).where(ProfessorProfile.user_id == professor.id)
        result = await session.execute(stmt)
        profile = result.scalar_one_or_none()

        user_dto = UserDTO(
            id=professor.id,
            email=professor.email,
            full_name=professor.full_name,
            role=professor.role,
            is_active=professor.is_active,
            created_at=professor.created_at,
        )

        return ProfessorProfileDTO(
            user=user_dto,
            title=profile.title if profile else None,
            institution=profile.institution if profile else None,
            department=profile.department if profile else None,
            bio=profile.bio if profile else None,
            default_teaching_profile=profile.default_teaching_profile if profile else {},
        )

    async def update_professor_profile(
        self, session: AsyncSession, professor: User, data: ProfessorProfileUpdateRequest
    ) -> ProfessorProfileDTO:
        stmt = select(ProfessorProfile).where(ProfessorProfile.user_id == professor.id)
        result = await session.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = ProfessorProfile(user_id=professor.id)
            session.add(profile)

        if data.full_name is not None:
            professor.full_name = data.full_name.strip()

        if data.title is not None:
            profile.title = data.title.strip() if data.title else None
        if data.institution is not None:
            profile.institution = data.institution.strip() if data.institution else None
        if data.department is not None:
            profile.department = data.department.strip() if data.department else None
        if data.bio is not None:
            profile.bio = data.bio.strip() if data.bio else None
        if data.default_teaching_profile is not None:
            profile.default_teaching_profile = data.default_teaching_profile.model_dump()

        profile.updated_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(professor)
        await session.refresh(profile)

        return await self.get_professor_profile(session, professor)

    async def get_professor_dashboard(
        self, session: AsyncSession, professor_id: uuid.UUID
    ) -> ProfessorDashboardDTO:
        # Courses count
        courses_stmt = select(func.count(Course.id)).where(
            Course.professor_id == professor_id, Course.deleted_at.is_(None)
        )
        total_courses = (await session.execute(courses_stmt)).scalar() or 0

        # Draft / published lectures count
        lectures_stmt = (
            select(Lecture.status, func.count(Lecture.id))
            .join(Course, Course.id == Lecture.course_id)
            .where(Course.professor_id == professor_id, Lecture.deleted_at.is_(None))
            .group_by(Lecture.status)
        )
        lecture_counts = dict((await session.execute(lectures_stmt)).all())
        published_lectures = lecture_counts.get(LectureStatus.PUBLISHED, 0)
        draft_lectures = (
            lecture_counts.get(LectureStatus.DRAFT, 0)
            + lecture_counts.get(LectureStatus.REVIEW_REQUIRED, 0)
            + lecture_counts.get(LectureStatus.GENERATING, 0)
        )

        # Enrolled students count across courses
        enrollment_stmt = (
            select(func.count(Enrollment.id))
            .join(Course, Course.id == Enrollment.course_id)
            .where(
                Course.professor_id == professor_id,
                Course.deleted_at.is_(None),
                Enrollment.status == EnrollmentStatus.ENROLLED,
            )
        )
        total_enrolled = (await session.execute(enrollment_stmt)).scalar() or 0

        return ProfessorDashboardDTO(
            counts={
                "courses": total_courses,
                "draft_lectures": draft_lectures,
                "published_lectures": published_lectures,
            },
            active_jobs=[],
            recent_questions=[],
            engagement={
                "enrolled_total": total_enrolled,
                "completions_total": 0,
                "questions_7d": 0,
            },
        )

    async def create_course(
        self, session: AsyncSession, professor: User, data: CourseCreateRequest
    ) -> CourseDTO:
        teaching_profile = None
        if data.teaching_profile:
            teaching_profile = data.teaching_profile.model_dump()
        else:
            prof_profile_stmt = select(ProfessorProfile).where(
                ProfessorProfile.user_id == professor.id
            )
            prof_profile = (await session.execute(prof_profile_stmt)).scalar_one_or_none()
            if prof_profile and prof_profile.default_teaching_profile:
                teaching_profile = dict(prof_profile.default_teaching_profile)

        course = Course(
            professor_id=professor.id,
            title=data.title.strip(),
            description=data.description.strip(),
            subject=data.subject.strip(),
            department=data.department.strip() if data.department else None,
            status=CourseStatus.DRAFT,
            teaching_profile=teaching_profile or {},
        )
        session.add(course)
        await session.commit()
        await session.refresh(course)

        return CourseDTO(
            id=course.id,
            professor_id=course.professor_id,
            professor_name=professor.full_name,
            title=course.title,
            description=course.description,
            subject=course.subject,
            department=course.department,
            status=course.status,
            teaching_profile=course.teaching_profile,
            moderation_note=course.moderation_note,
            created_at=course.created_at,
            updated_at=course.updated_at,
            units=[],
            enrolled=False,
        )

    async def list_professor_courses(
        self,
        session: AsyncSession,
        professor_id: uuid.UUID,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedCoursesDTO:
        stmt = (
            select(Course)
            .options(selectinload(Course.professor))
            .where(Course.professor_id == professor_id, Course.deleted_at.is_(None))
        )
        if status:
            stmt = stmt.where(Course.status == status)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.execute(count_stmt)).scalar() or 0

        stmt = (
            stmt.order_by(Course.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
        courses = (await session.execute(stmt)).scalars().all()

        items = []
        for c in courses:
            # lecture count
            lec_count_stmt = select(func.count(Lecture.id)).where(
                Lecture.course_id == c.id, Lecture.deleted_at.is_(None)
            )
            lec_count = (await session.execute(lec_count_stmt)).scalar() or 0

            items.append(
                CourseSummaryDTO(
                    id=c.id,
                    title=c.title,
                    subject=c.subject,
                    department=c.department,
                    status=c.status,
                    professor_id=c.professor_id,
                    professor_name=c.professor.full_name if c.professor else "",
                    lecture_count=lec_count,
                    enrolled=False,
                    created_at=c.created_at,
                )
            )

        return PaginatedCoursesDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_professor_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> CourseDTO:
        stmt = (
            select(Course)
            .options(
                selectinload(Course.professor),
                selectinload(Course.units),
            )
            .where(
                Course.id == course_id,
                Course.professor_id == professor_id,
                Course.deleted_at.is_(None),
            )
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        # Load units with lectures
        unit_dtos = []
        for unit in course.units:
            if unit.deleted_at is not None:
                continue

            lec_stmt = (
                select(Lecture)
                .where(Lecture.unit_id == unit.id, Lecture.deleted_at.is_(None))
                .order_by(Lecture.position)
            )
            lectures = (await session.execute(lec_stmt)).scalars().all()
            lec_dtos = [
                LectureSummaryDTO(
                    id=lec.id,
                    title=lec.title,
                    position=lec.position,
                    status=lec.status,
                    slide_count=lec.slide_count,
                    total_duration_seconds=lec.total_duration_seconds,
                )
                for lec in lectures
            ]

            unit_dtos.append(
                CourseUnitDTO(
                    id=unit.id,
                    course_id=unit.course_id,
                    title=unit.title,
                    description=unit.description,
                    position=unit.position,
                    created_at=unit.created_at,
                    lectures=lec_dtos,
                )
            )

        return CourseDTO(
            id=course.id,
            professor_id=course.professor_id,
            professor_name=course.professor.full_name if course.professor else "",
            title=course.title,
            description=course.description,
            subject=course.subject,
            department=course.department,
            status=course.status,
            teaching_profile=course.teaching_profile,
            moderation_note=course.moderation_note,
            created_at=course.created_at,
            updated_at=course.updated_at,
            units=unit_dtos,
            enrolled=False,
        )

    async def update_course(
        self,
        session: AsyncSession,
        course_id: uuid.UUID,
        professor_id: uuid.UUID,
        data: CourseUpdateRequest,
    ) -> CourseDTO:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        if data.title is not None:
            course.title = data.title.strip()
        if data.description is not None:
            course.description = data.description.strip()
        if data.subject is not None:
            course.subject = data.subject.strip()
        if data.department is not None:
            course.department = data.department.strip() if data.department else None
        if data.teaching_profile is not None:
            course.teaching_profile = data.teaching_profile.model_dump()

        course.updated_at = datetime.now(UTC)
        await session.commit()
        return await self.get_professor_course(session, course_id, professor_id)

    async def delete_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> None:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        # Check for active enrollments
        enrollment_check = select(func.count(Enrollment.id)).where(
            Enrollment.course_id == course_id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
        active_enrollments = (await session.execute(enrollment_check)).scalar() or 0
        if active_enrollments > 0:
            raise ConflictError(
                code="COURSE_HAS_ENROLLMENTS",
                message="Course has active student enrollments and cannot be deleted. Please archive the course instead.",
            )

        now = datetime.now(UTC)
        course.deleted_at = now

        # Soft delete child units
        units_stmt = select(CourseUnit).where(CourseUnit.course_id == course_id)
        units = (await session.execute(units_stmt)).scalars().all()
        for u in units:
            u.deleted_at = now

        await session.commit()

    async def publish_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> CourseDTO:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        if course.moderation_note:
            raise ConflictError(
                code="COURSE_MODERATED",
                message="This course has been moderated by an administrator and cannot be published.",
            )

        # Course can be published by the professor directly
        course.status = CourseStatus.PUBLISHED
        course.updated_at = datetime.now(UTC)
        await session.commit()
        return await self.get_professor_course(session, course_id, professor_id)

    async def unpublish_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> CourseDTO:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        course.status = CourseStatus.DRAFT
        course.updated_at = datetime.now(UTC)
        await session.commit()
        return await self.get_professor_course(session, course_id, professor_id)

    async def archive_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> CourseDTO:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        course.status = CourseStatus.ARCHIVED
        course.updated_at = datetime.now(UTC)
        await session.commit()
        return await self.get_professor_course(session, course_id, professor_id)

    async def unarchive_course(
        self, session: AsyncSession, course_id: uuid.UUID, professor_id: uuid.UUID
    ) -> CourseDTO:
        stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        course.status = CourseStatus.DRAFT
        course.updated_at = datetime.now(UTC)
        await session.commit()
        return await self.get_professor_course(session, course_id, professor_id)

    async def create_unit(
        self,
        session: AsyncSession,
        course_id: uuid.UUID,
        professor_id: uuid.UUID,
        data: CourseUnitCreateRequest,
    ) -> CourseUnitDTO:
        course_stmt = select(Course).where(
            Course.id == course_id,
            Course.professor_id == professor_id,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(course_stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        pos_stmt = select(func.max(CourseUnit.position)).where(
            CourseUnit.course_id == course_id, CourseUnit.deleted_at.is_(None)
        )
        max_pos = (await session.execute(pos_stmt)).scalar() or 0

        unit = CourseUnit(
            course_id=course_id,
            title=data.title.strip(),
            description=data.description.strip(),
            position=max_pos + 1,
        )
        session.add(unit)
        await session.commit()
        await session.refresh(unit)

        return CourseUnitDTO(
            id=unit.id,
            course_id=unit.course_id,
            title=unit.title,
            description=unit.description,
            position=unit.position,
            created_at=unit.created_at,
            lectures=[],
        )

    async def update_unit(
        self,
        session: AsyncSession,
        unit_id: uuid.UUID,
        professor_id: uuid.UUID,
        data: CourseUnitUpdateRequest,
    ) -> CourseUnitDTO:
        stmt = (
            select(CourseUnit)
            .join(Course, Course.id == CourseUnit.course_id)
            .where(
                CourseUnit.id == unit_id,
                Course.professor_id == professor_id,
                CourseUnit.deleted_at.is_(None),
                Course.deleted_at.is_(None),
            )
        )
        unit = (await session.execute(stmt)).scalar_one_or_none()
        if not unit:
            raise NotFoundError(code="UNIT_NOT_FOUND", message="Unit not found.")

        if data.title is not None:
            unit.title = data.title.strip()
        if data.description is not None:
            unit.description = data.description.strip()

        unit.updated_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(unit)

        return CourseUnitDTO(
            id=unit.id,
            course_id=unit.course_id,
            title=unit.title,
            description=unit.description,
            position=unit.position,
            created_at=unit.created_at,
            lectures=[],
        )

    async def delete_unit(
        self, session: AsyncSession, unit_id: uuid.UUID, professor_id: uuid.UUID
    ) -> None:
        stmt = (
            select(CourseUnit)
            .join(Course, Course.id == CourseUnit.course_id)
            .where(
                CourseUnit.id == unit_id,
                Course.professor_id == professor_id,
                CourseUnit.deleted_at.is_(None),
                Course.deleted_at.is_(None),
            )
        )
        unit = (await session.execute(stmt)).scalar_one_or_none()
        if not unit:
            raise NotFoundError(code="UNIT_NOT_FOUND", message="Unit not found.")

        # Check for published lectures
        lec_check = select(func.count(Lecture.id)).where(
            Lecture.unit_id == unit_id,
            Lecture.status == LectureStatus.PUBLISHED,
            Lecture.deleted_at.is_(None),
        )
        published_lectures = (await session.execute(lec_check)).scalar() or 0
        if published_lectures > 0:
            raise ConflictError(
                code="UNIT_HAS_PUBLISHED_LECTURES",
                message="Cannot delete a unit with published lectures.",
            )

        now = datetime.now(UTC)
        unit.deleted_at = now

        # Soft delete lectures in this unit
        lec_stmt = select(Lecture).where(Lecture.unit_id == unit_id)
        lectures = (await session.execute(lec_stmt)).scalars().all()
        for lec in lectures:
            lec.deleted_at = now

        await session.commit()
