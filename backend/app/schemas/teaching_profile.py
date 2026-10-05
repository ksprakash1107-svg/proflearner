from typing import Literal

from pydantic import BaseModel, Field

TeachingStyleType = Literal["STEP_BY_STEP", "CONCEPTUAL", "EXAMPLE_DRIVEN", "SUMMARY_FIRST"]
ExplanationStyleType = Literal["CONCEPT_FIRST", "EQUATION_FIRST", "EXAMPLE_FIRST"]
DifficultyType = Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]
ResponseLengthType = Literal["SHORT", "MEDIUM", "DETAILED"]
ToneType = Literal["FORMAL", "FRIENDLY", "ENCOURAGING"]
TechnicalDepthType = Literal["LOW", "MEDIUM", "HIGH"]


class TeachingProfileSchema(BaseModel):
    teaching_style: TeachingStyleType = "STEP_BY_STEP"
    explanation_style: ExplanationStyleType = "CONCEPT_FIRST"
    language: str = Field(default="en", min_length=2, max_length=10)
    difficulty: DifficultyType = "INTERMEDIATE"
    preferred_examples: list[str] = Field(default_factory=list, max_length=5)
    response_length: ResponseLengthType = "MEDIUM"
    tone: ToneType = "FRIENDLY"
    technical_depth: TechnicalDepthType = "MEDIUM"
    additional_instructions: str = Field(default="", max_length=1000)
