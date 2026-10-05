import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SlideDTO(BaseModel):
    id: uuid.UUID
    slide_number: int
    title: str
    content: dict[str, Any]
    narration_script: str
    duration_seconds: int = 30
    audio_url: str | None = None
    source_page_start: int | None = None
    source_page_end: int | None = None

    model_config = {"from_attributes": True}


class LectureDetailDTO(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    unit_id: uuid.UUID
    title: str
    description: str
    status: str
    slide_count: int
    total_duration_seconds: int
    slides: list[SlideDTO] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class TutorAskRequest(BaseModel):
    slide_number: int = Field(..., ge=1)
    question: str = Field(..., min_length=2, max_length=1000)


class TutorAnswerDTO(BaseModel):
    answer: str
    slide_number: int
    citations: list[str] = Field(default_factory=list)
