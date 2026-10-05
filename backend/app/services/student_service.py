import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.db.enums import CourseStatus, EnrollmentStatus, LectureStatus
from app.db.models.auth import StudentProfile, User
from app.db.models.course import Course, Enrollment
from app.db.models.lecture import Lecture
from app.schemas.auth import UserDTO
from app.schemas.course import (
    CourseDTO,
    CourseSummaryDTO,
    CourseUnitDTO,
    LectureSummaryDTO,
    PaginatedCoursesDTO,
)
from app.schemas.student import (
    EnrollmentDTO,
    StudentDashboardDTO,
    StudentProfileDTO,
    StudentProfileUpdateRequest,
)


class StudentService:
    async def get_student_profile(self, session: AsyncSession, student: User) -> StudentProfileDTO:
        stmt = select(StudentProfile).where(StudentProfile.user_id == student.id)
        result = await session.execute(stmt)
        profile = result.scalar_one_or_none()

        user_dto = UserDTO(
            id=student.id,
            email=student.email,
            full_name=student.full_name,
            role=student.role,
            is_active=student.is_active,
            created_at=student.created_at,
        )

        return StudentProfileDTO(
            user=user_dto,
            institution=profile.institution if profile else None,
            program=profile.program if profile else None,
            preferred_language=profile.preferred_language if profile else None,
        )

    async def update_student_profile(
        self, session: AsyncSession, student: User, data: StudentProfileUpdateRequest
    ) -> StudentProfileDTO:
        stmt = select(StudentProfile).where(StudentProfile.user_id == student.id)
        result = await session.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = StudentProfile(user_id=student.id)
            session.add(profile)

        if data.full_name is not None:
            student.full_name = data.full_name.strip()

        if data.institution is not None:
            profile.institution = data.institution.strip() if data.institution else None
        if data.program is not None:
            profile.program = data.program.strip() if data.program else None
        if data.preferred_language is not None:
            profile.preferred_language = (
                data.preferred_language.strip() if data.preferred_language else None
            )

        profile.updated_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(student)
        await session.refresh(profile)

        return await self.get_student_profile(session, student)

    async def list_published_courses(
        self,
        session: AsyncSession,
        q: str | None = None,
        subject: str | None = None,
        page: int = 1,
        page_size: int = 20,
        student_id: uuid.UUID | None = None,
    ) -> PaginatedCoursesDTO:
        stmt = (
            select(Course)
            .options(selectinload(Course.professor))
            .where(Course.status == CourseStatus.PUBLISHED, Course.deleted_at.is_(None))
        )

        if q:
            term = f"%{q.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Course.title).like(term),
                    func.lower(Course.description).like(term),
                    func.lower(Course.subject).like(term),
                )
            )

        if subject:
            stmt = stmt.where(func.lower(Course.subject) == subject.strip().lower())

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.execute(count_stmt)).scalar() or 0

        stmt = (
            stmt.order_by(Course.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
        courses = (await session.execute(stmt)).scalars().all()

        # Enrolled courses for this student
        enrolled_course_ids = set()
        if student_id:
            enr_stmt = select(Enrollment.course_id).where(
                Enrollment.student_id == student_id,
                Enrollment.status == EnrollmentStatus.ENROLLED,
            )
            enrolled_course_ids = set((await session.execute(enr_stmt)).scalars().all())

        items = []
        for c in courses:
            lec_count_stmt = select(func.count(Lecture.id)).where(
                Lecture.course_id == c.id,
                Lecture.status == LectureStatus.PUBLISHED,
                Lecture.deleted_at.is_(None),
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
                    enrolled=(c.id in enrolled_course_ids),
                    created_at=c.created_at,
                )
            )

        return PaginatedCoursesDTO(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_student_course(
        self, session: AsyncSession, course_id: uuid.UUID, student_id: uuid.UUID
    ) -> CourseDTO:
        stmt = (
            select(Course)
            .options(
                selectinload(Course.professor),
                selectinload(Course.units),
            )
            .where(
                Course.id == course_id,
                Course.status == CourseStatus.PUBLISHED,
                Course.deleted_at.is_(None),
            )
        )
        course = (await session.execute(stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        # Check enrollment
        enr_stmt = select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
        enrolled = (await session.execute(enr_stmt)).scalar_one_or_none() is not None

        # Build units with published lectures
        unit_dtos = []
        for unit in course.units:
            if unit.deleted_at is not None:
                continue

            lec_stmt = (
                select(Lecture)
                .where(
                    Lecture.unit_id == unit.id,
                    Lecture.status == LectureStatus.PUBLISHED,
                    Lecture.deleted_at.is_(None),
                )
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
            enrolled=enrolled,
        )

    async def enroll_in_course(
        self, session: AsyncSession, course_id: uuid.UUID, student_id: uuid.UUID
    ) -> EnrollmentDTO:
        course_stmt = select(Course).where(
            Course.id == course_id,
            Course.status == CourseStatus.PUBLISHED,
            Course.deleted_at.is_(None),
        )
        course = (await session.execute(course_stmt)).scalar_one_or_none()
        if not course:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        # Idempotent check
        stmt = select(Enrollment).where(
            Enrollment.course_id == course_id, Enrollment.student_id == student_id
        )
        enrollment = (await session.execute(stmt)).scalar_one_or_none()

        if enrollment:
            if enrollment.status != EnrollmentStatus.ENROLLED:
                enrollment.status = EnrollmentStatus.ENROLLED
                enrollment.enrolled_at = datetime.now(UTC)
                enrollment.unenrolled_at = None
                await session.commit()
                await session.refresh(enrollment)
        else:
            enrollment = Enrollment(
                course_id=course_id,
                student_id=student_id,
                status=EnrollmentStatus.ENROLLED,
            )
            session.add(enrollment)
            await session.commit()
            await session.refresh(enrollment)

        return EnrollmentDTO(
            id=enrollment.id,
            student_id=enrollment.student_id,
            course_id=enrollment.course_id,
            status=enrollment.status,
            enrolled_at=enrollment.enrolled_at,
        )

    async def get_student_enrollments(
        self, session: AsyncSession, student_id: uuid.UUID
    ) -> list[EnrollmentDTO]:
        stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.course).selectinload(Course.professor))
            .where(
                Enrollment.student_id == student_id,
                Enrollment.status == EnrollmentStatus.ENROLLED,
            )
            .order_by(Enrollment.enrolled_at.desc())
        )
        enrollments = (await session.execute(stmt)).scalars().all()

        dtos = []
        for enr in enrollments:
            course_summary = None
            if enr.course and enr.course.deleted_at is None:
                lec_count_stmt = select(func.count(Lecture.id)).where(
                    Lecture.course_id == enr.course_id,
                    Lecture.status == LectureStatus.PUBLISHED,
                    Lecture.deleted_at.is_(None),
                )
                lec_count = (await session.execute(lec_count_stmt)).scalar() or 0
                course_summary = CourseSummaryDTO(
                    id=enr.course.id,
                    title=enr.course.title,
                    subject=enr.course.subject,
                    department=enr.course.department,
                    status=enr.course.status,
                    professor_id=enr.course.professor_id,
                    professor_name=enr.course.professor.full_name if enr.course.professor else "",
                    lecture_count=lec_count,
                    enrolled=True,
                    created_at=enr.course.created_at,
                )

            dtos.append(
                EnrollmentDTO(
                    id=enr.id,
                    student_id=enr.student_id,
                    course_id=enr.course_id,
                    status=enr.status,
                    enrolled_at=enr.enrolled_at,
                    course=course_summary,
                )
            )

        return dtos

    async def get_student_dashboard(
        self, session: AsyncSession, student_id: uuid.UUID
    ) -> StudentDashboardDTO:
        enrollments = await self.get_student_enrollments(session, student_id)
        enrolled_courses = [e.course for e in enrollments if e.course is not None]

        return StudentDashboardDTO(
            enrolled_courses=enrolled_courses,
            continue_learning=None,
            recent_lectures=[],
            completed_count=0,
        )
