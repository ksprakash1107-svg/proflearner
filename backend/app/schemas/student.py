import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.auth import UserDTO
from app.schemas.course import CourseSummaryDTO


class StudentProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    institution: str | None = Field(default=None, max_length=200)
    program: str | None = Field(default=None, max_length=200)
    preferred_language: str | None = Field(default=None, max_length=10)


class StudentProfileDTO(BaseModel):
    user: UserDTO
    institution: str | None
    program: str | None
    preferred_language: str | None


class EnrollmentDTO(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    status: str
    enrolled_at: datetime
    course: CourseSummaryDTO | None = None


class StudentDashboardDTO(BaseModel):
    enrolled_courses: list[CourseSummaryDTO]
    continue_learning: dict[str, Any] | None = None
    recent_lectures: list[dict[str, Any]] = []
    completed_count: int = 0
