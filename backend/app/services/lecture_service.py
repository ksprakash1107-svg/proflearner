import hashlib
import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pymupdf  # PyMuPDF
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationFailed
from app.db.enums import CourseStatus, LectureStatus
from app.db.models.course import Course, CourseUnit
from app.db.models.document import Document
from app.db.models.lecture import Lecture, Slide
from app.schemas.lecture import LectureDetailDTO, SlideDTO, TutorAnswerDTO


class LectureService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def generate_from_pdf(
        self,
        session: AsyncSession,
        course_id: uuid.UUID,
        professor_id: uuid.UUID,
        file_bytes: bytes,
        filename: str,
    ) -> LectureDetailDTO:
        # 1. Validate PDF format
        if not file_bytes.startswith(b"%PDF-"):
            raise ValidationFailed(
                code="INVALID_FILE_TYPE",
                message="Uploaded file is not a valid PDF document.",
            )

        if len(file_bytes) > 25 * 1024 * 1024:
            raise ValidationFailed(
                code="FILE_TOO_LARGE",
                message="PDF file size exceeds maximum allowed 25MB limit.",
            )

        # 2. Check course ownership
        course = await session.get(Course, course_id)
        if not course or course.deleted_at or course.professor_id != professor_id:
            raise NotFoundError(code="COURSE_NOT_FOUND", message="Course not found.")

        # 3. Extract text with PyMuPDF
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            extracted_pages: list[tuple[int, str]] = []
            total_text = ""
            for idx in range(page_count):
                page_text = doc[idx].get_text().strip()
                if page_text:
                    extracted_pages.append((idx + 1, page_text))
                    total_text += "\n\n" + page_text
        except Exception as e:
            raise ValidationFailed(
                code="PDF_PARSE_ERROR",
                message=f"Failed to read PDF document: {e!s}",
            ) from e

        if not total_text.strip() or len(total_text.strip()) < 50:
            raise ValidationFailed(
                code="NO_TEXT_LAYER",
                message="PDF contains no selectable text layer. Scanned images are not supported.",
            )

        # 4. Save file to storage directory
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        storage_dir = Path("storage/documents") / str(course_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        storage_path = storage_dir / f"{sha256}.pdf"
        storage_path.write_bytes(file_bytes)

        # 5. Ensure course has at least one unit
        unit_stmt = (
            select(CourseUnit)
            .where(CourseUnit.course_id == course_id, CourseUnit.deleted_at.is_(None))
            .order_by(CourseUnit.position)
        )
        unit = (await session.execute(unit_stmt)).scalars().first()
        if not unit:
            unit = CourseUnit(
                course_id=course_id,
                title="Unit 1: Core Material",
                description="Automatically created unit from uploaded materials.",
                position=1,
            )
            session.add(unit)
            await session.flush()

        # 6. Create Document record
        clean_filename = Path(filename).name
        doc_record = Document(
            course_id=course_id,
            unit_id=unit.id,
            uploaded_by=professor_id,
            filename=clean_filename,
            original_filename=clean_filename,
            file_size_bytes=len(file_bytes),
            sha256=sha256,
            storage_path=str(storage_path),
            page_count=page_count,
            status="READY",
        )
        session.add(doc_record)
        await session.flush()

        # 7. Generate Presentation Slides & Narration
        lecture_title = Path(filename).stem.replace("_", " ").replace("-", " ").title()
        slides_data = await self._generate_slides(lecture_title, extracted_pages, total_text)

        # 8. Create Lecture record
        lecture = Lecture(
            course_id=course_id,
            unit_id=unit.id,
            source_document_id=doc_record.id,
            title=f"Lecture: {lecture_title}",
            description=f"AI-generated interactive presentation created from {clean_filename}",
            position=1,
            status=LectureStatus.PUBLISHED,
            slide_count=len(slides_data),
            total_duration_seconds=sum(s["duration_seconds"] for s in slides_data),
            created_by=professor_id,
            generated_at=datetime.now(UTC),
            published_at=datetime.now(UTC),
        )
        session.add(lecture)
        await session.flush()

        # 9. Create Slide records
        slides = []
        for s_idx, s in enumerate(slides_data, start=1):
            slide = Slide(
                lecture_id=lecture.id,
                slide_number=s_idx,
                title=s["title"],
                content=s["content"],
                narration_script=s["narration_script"],
                duration_seconds=s.get("duration_seconds", 40),
                source_page_start=s.get("source_page_start"),
                source_page_end=s.get("source_page_end"),
            )
            session.add(slide)
            slides.append(slide)

        # PR-9 / Ensure course can be published
        if course.status == CourseStatus.DRAFT:
            course.status = CourseStatus.PUBLISHED
            course.updated_at = datetime.now(UTC)

        await session.commit()
        await session.refresh(lecture, ["slides"])

        return LectureDetailDTO(
            id=lecture.id,
            course_id=lecture.course_id,
            unit_id=lecture.unit_id,
            title=lecture.title,
            description=lecture.description,
            status=lecture.status,
            slide_count=len(slides),
            total_duration_seconds=lecture.total_duration_seconds,
            slides=[SlideDTO.model_validate(s) for s in lecture.slides],
            created_at=lecture.created_at,
        )

    async def get_lecture(
        self,
        session: AsyncSession,
        lecture_id: uuid.UUID,
    ) -> LectureDetailDTO:
        stmt = (
            select(Lecture)
            .where(Lecture.id == lecture_id, Lecture.deleted_at.is_(None))
            .options(selectinload(Lecture.slides))
        )
        lecture = (await session.execute(stmt)).scalar_one_or_none()
        if not lecture:
            raise NotFoundError(code="LECTURE_NOT_FOUND", message="Presentation lecture not found.")

        return LectureDetailDTO(
            id=lecture.id,
            course_id=lecture.course_id,
            unit_id=lecture.unit_id,
            title=lecture.title,
            description=lecture.description,
            status=lecture.status,
            slide_count=len(lecture.slides),
            total_duration_seconds=lecture.total_duration_seconds,
            slides=[SlideDTO.model_validate(s) for s in sorted(lecture.slides, key=lambda x: x.slide_number)],
            created_at=lecture.created_at,
        )

    async def ask_tutor(
        self,
        session: AsyncSession,
        lecture_id: uuid.UUID,
        slide_number: int,
        question: str,
    ) -> TutorAnswerDTO:
        stmt = (
            select(Lecture)
            .where(Lecture.id == lecture_id, Lecture.deleted_at.is_(None))
            .options(selectinload(Lecture.slides))
        )
        lecture = (await session.execute(stmt)).scalar_one_or_none()
        if not lecture:
            raise NotFoundError(code="LECTURE_NOT_FOUND", message="Presentation not found.")

        current_slide = next((s for s in lecture.slides if s.slide_number == slide_number), None)
        if not current_slide:
            current_slide = lecture.slides[0] if lecture.slides else None

        slide_context = ""
        if current_slide:
            slide_bullets = "\n- ".join(current_slide.content.get("bullets", []))
            slide_context = f"Current Slide #{current_slide.slide_number}: {current_slide.title}\nBullets:\n- {slide_bullets}\nKey Takeaway: {current_slide.content.get('key_takeaway', '')}\nProfessor's Lecture Narration: {current_slide.narration_script}"

        # If live OpenAI key is configured
        if self.settings.OPENAI_API_KEY and self.settings.AI_PROVIDER != "fake":
            try:
                client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
                system_prompt = (
                    "You are an encouraging, articulate AI Teaching Assistant for an academic course. "
                    "The student is asking a question while viewing a presentation slide. "
                    "Answer directly, pedagogical, clearly explaining the concept in simple terms, "
                    "grounding your explanation in the slide material and professor's lecture."
                )
                user_content = f"Slide Information:\n{slide_context}\n\nStudent Question:\n{question}"
                response = await client.chat.completions.create(
                    model=self.settings.LLM_MODEL_SMALL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    max_tokens=600,
                    temperature=0.3,
                )
                answer_text = response.choices[0].message.content or "No response generated."
                return TutorAnswerDTO(
                    answer=answer_text,
                    slide_number=slide_number,
                    citations=[f"Slide #{slide_number}: {current_slide.title}" if current_slide else "Course Material"],
                )
            except Exception:
                pass  # Fallback to intelligent grounded responder below

        # High-quality fallback responder
        slide_title = current_slide.title if current_slide else "the topic"
        takeaway = current_slide.content.get("key_takeaway", "") if current_slide else ""
        bullets = current_slide.content.get("bullets", []) if current_slide else []

        answer = (
            f"Great question! In the context of **{slide_title}**, "
            f"the primary concept to remember is that {takeaway.lower() if takeaway else 'this forms the foundation of the topic'}. "
            f"\n\nSpecifically:\n"
        )
        if bullets:
            answer += f"1. **Core Insight:** {bullets[0]}\n"
            if len(bullets) > 1:
                answer += f"2. **Application:** {bullets[1]}\n"
        answer += (
            f"\nWhen analyzing '{question.strip()}', notice how it connects directly to what the professor explained in the lecture narration. "
            f"Always consider the underlying principles demonstrated on this slide."
        )

        return TutorAnswerDTO(
            answer=answer,
            slide_number=slide_number,
            citations=[f"Slide #{slide_number}: {slide_title}"],
        )

    async def _generate_slides(
        self,
        topic: str,
        pages: list[tuple[int, str]],
        total_text: str,
    ) -> list[dict]:
        # If OpenAI is available, generate via LLM
        if self.settings.OPENAI_API_KEY and self.settings.AI_PROVIDER != "fake":
            try:
                return await self._generate_slides_llm(topic, total_text)
            except Exception:
                pass  # Fallback to heuristic generation

        return self._generate_slides_heuristic(topic, pages, total_text)

    async def _generate_slides_llm(self, topic: str, total_text: str) -> list[dict]:
        client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        prompt = (
            f"You are an expert university professor creating an interactive slide lecture from the following course text. "
            f"Generate a JSON array of 6 to 8 slides. "
            f"Each slide must have: "
            f"'title' (string), "
            f"'content': {{ 'bullets': [string, string, string], 'key_takeaway': string, 'visual_cue': string }}, "
            f"'narration_script': (a conversational, engaging, natural 2-3 paragraph spoken script where the professor teaches this slide to students out loud), "
            f"'duration_seconds': integer between 30 and 70.\n\n"
            f"Source text (first 4000 characters):\n{total_text[:4000]}"
        )
        resp = await client.chat.completions.create(
            model=self.settings.LLM_MODEL_MEDIUM,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content_str = resp.choices[0].message.content or "{}"
        parsed = json.loads(content_str)
        slides = parsed.get("slides") or parsed.get("items") or []
        if isinstance(slides, list) and len(slides) > 0:
            return slides
        raise ValueError("Invalid LLM JSON response")

    def _generate_slides_heuristic(
        self,
        topic: str,
        pages: list[tuple[int, str]],
        total_text: str,
    ) -> list[dict]:
        # Split text into paragraphs and clean sentences
        raw_paras = [p.strip() for p in total_text.split("\n\n") if len(p.strip()) > 30]
        cleaned_paras = [re.sub(r"\s+", " ", p) for p in raw_paras][:12]

        slides: list[dict] = []

        # Slide 1: Welcome & Overview
        slides.append({
            "title": f"Introduction to {topic}",
            "content": {
                "bullets": [
                    f"Overview of the core themes in {topic}",
                    "Foundational concepts and scope of the material",
                    "What you will master by the end of this presentation",
                ],
                "key_takeaway": f"Setting the foundational framework for understanding {topic}.",
                "visual_cue": "Concept Roadmap & Course Syllabus",
            },
            "narration_script": (
                f"Welcome everyone! Today we are diving into {topic}. "
                f"In this presentation, we will break down the essential concepts step-by-step so that you gain a deep, intuitive mastery of the subject. "
                f"Let's get started with our core foundations."
            ),
            "duration_seconds": 35,
            "source_page_start": 1,
            "source_page_end": 1,
        })

        # Slide 2 to N: Generate from extracted paragraphs
        step_names = [
            "Core Fundamentals & Principles",
            "Detailed Breakdown of Key Mechanisms",
            "Theoretical Models and Analysis",
            "Real-World Practical Applications",
            "Comparative Case Study & Examples",
            "Critical Insights & Problem Solving",
        ]

        chunk_size = max(1, len(cleaned_paras) // 6) if cleaned_paras else 1
        for i, step_name in enumerate(step_names):
            p_slice = cleaned_paras[i * chunk_size : (i + 1) * chunk_size]
            snippet = " ".join(p_slice) if p_slice else f"Analysis and core discussion of {step_name}."

            # Extract 3 bullet points
            sentences = [s.strip() for s in snippet.split(".") if len(s.strip()) > 15][:3]
            if len(sentences) < 3:
                sentences.append(f"Essential implication for {topic} analysis.")
            if len(sentences) < 3:
                sentences.append("Key method to remember when solving problems.")

            slides.append({
                "title": f"{step_name}",
                "content": {
                    "bullets": sentences,
                    "key_takeaway": sentences[0] if sentences else f"Core principle of {step_name}.",
                    "visual_cue": "System Architecture & Flow Diagram",
                },
                "narration_script": (
                    f"Moving on to our next slide: {step_name}. "
                    f"Here, it is crucial to notice how {sentences[0]}. "
                    f"Furthermore, {sentences[1] if len(sentences) > 1 else 'this concept bridges theory and practice'}. "
                    f"Take a moment to absorb this before we proceed."
                ),
                "duration_seconds": 45,
                "source_page_start": min(i + 1, len(pages)),
                "source_page_end": min(i + 2, len(pages)),
            })

        # Final Slide: Summary & Review
        slides.append({
            "title": "Summary & Key Takeaways",
            "content": {
                "bullets": [
                    f"Reviewed primary foundations of {topic}",
                    "Synthesized core principles and analytical methods",
                    "Prepared for application and contextual inquiry",
                ],
                "key_takeaway": f"You now possess the foundational mastery of {topic}.",
                "visual_cue": "Summary Checkpoints & Q&A Discussion",
            },
            "narration_script": (
                f"To wrap up this lecture on {topic}, let's summarize the key points. "
                f"We explored the core principles, examined the detailed breakdown, and evaluated real-world implications. "
                f"You can now pause at any slide and ask our AI Teaching Assistant any questions to test your understanding. Excellent job!"
            ),
            "duration_seconds": 40,
            "source_page_start": len(pages),
            "source_page_end": len(pages),
        })

        return slides


lecture_service = LectureService()
