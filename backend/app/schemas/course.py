import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.auth import UserDTO
from app.schemas.teaching_profile import TeachingProfileSchema


class CourseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    subject: str = Field(min_length=1, max_length=120)
    department: str | None = Field(default=None, max_length=200)
    teaching_profile: TeachingProfileSchema | None = None


class CourseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    subject: str | None = Field(default=None, min_length=1, max_length=120)
    department: str | None = Field(default=None, max_length=200)
    teaching_profile: TeachingProfileSchema | None = None


class CourseUnitCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)


class CourseUnitUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class LectureSummaryDTO(BaseModel):
    id: uuid.UUID
    title: str
    position: int
    status: str
    slide_count: int = 0
    total_duration_seconds: int = 0


class CourseUnitDTO(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str
    position: int
    created_at: datetime
    lectures: list[LectureSummaryDTO] = []


class CourseSummaryDTO(BaseModel):
    id: uuid.UUID
    title: str
    subject: str
    department: str | None
    status: str
    professor_id: uuid.UUID
    professor_name: str
    lecture_count: int = 0
    enrolled: bool = False
    created_at: datetime


class CourseDTO(BaseModel):
    id: uuid.UUID
    professor_id: uuid.UUID
    professor_name: str
    title: str
    description: str
    subject: str
    department: str | None
    status: str
    teaching_profile: dict[str, Any]
    moderation_note: str | None = None
    created_at: datetime
    updated_at: datetime
    units: list[CourseUnitDTO] = []
    enrolled: bool = False


class PaginatedCoursesDTO(BaseModel):
    items: list[CourseSummaryDTO]
    total: int
    page: int
    page_size: int


class ProfessorProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    title: str | None = Field(default=None, max_length=50)
    institution: str | None = Field(default=None, max_length=200)
    department: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=2000)
    default_teaching_profile: TeachingProfileSchema | None = None


class ProfessorProfileDTO(BaseModel):
    user: UserDTO
    title: str | None
    institution: str | None
    department: str | None
    bio: str | None
    default_teaching_profile: dict[str, Any]


class ProfessorDashboardDTO(BaseModel):
    counts: dict[str, int]
    active_jobs: list[dict[str, Any]]
    recent_questions: list[dict[str, Any]]
    engagement: dict[str, int]
