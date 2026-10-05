import pymupdf
import pytest
from httpx import ASGITransport

from app.main import app
from tests.conftest import CsrfAwareClient


def create_sample_pdf_bytes() -> bytes:
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "Introduction to Operating Systems and Concurrency\n\n"
        "An operating system is system software that manages computer hardware and software resources. "
        "It provides common services for computer programs. Time-sharing operating systems schedule tasks "
        "for efficient use of the system and may also include accounting software for cost allocation of "
        "processor time, mass storage, printing, and other resources.\n\n"
        "Concurrency refers to the ability of different parts or units of a program, algorithm, or problem "
        "to be executed out-of-order or in partial order, without affecting the outcome. Concurrency allows "
        "for parallel execution of concurrent units, which can significantly improve execution speed in "
        "multi-processor systems.",
    )

    page2 = doc.new_page()
    page2.insert_text(
        (50, 72),
        "Process Scheduling and Thread Synchronization\n\n"
        "The process scheduler is an essential component of the operating system that decides which processes "
        "run when resources are free. Various scheduling algorithms such as First-Come First-Served, Round Robin, "
        "and Shortest Job Next balance throughput, latency, and fairness.\n\n"
        "Thread synchronization is defined as a mechanism which ensures that two or more concurrent processes "
        "or threads do not simultaneously execute some particular program segment known as a critical section.",
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_pdf_upload_presentation_generation_and_tutor(
    client: CsrfAwareClient,
):
    # 1. Register Professor
    prof_data = {
        "email": "dr_oak@example.edu",
        "password": "Password123!",
        "full_name": "Professor Oak",
        "role": "PROFESSOR",
    }
    reg_res = await client.post("/api/v1/auth/register", json=prof_data)
    assert reg_res.status_code == 201

    # 2. Create Course
    course_payload = {
        "title": "Operating Systems & Systems Architecture",
        "description": "Comprehensive course on OS primitives and concurrency.",
        "subject": "Computer Science",
        "department": "School of Computing",
    }
    course_res = await client.post("/api/v1/professor/courses", json=course_payload)
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    # 3. Upload PDF and generate presentation directly
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("operating_systems_notes.pdf", pdf_bytes, "application/pdf")}

    gen_res = await client.post(
        f"/api/v1/professor/courses/{course_id}/generate-from-pdf",
        files=files,
    )
    assert gen_res.status_code == 201
    lecture_data = gen_res.json()
    assert lecture_data["title"].startswith("Lecture:")
    assert lecture_data["slide_count"] >= 3
    assert len(lecture_data["slides"]) >= 3

    lecture_id = lecture_data["id"]
    slide1 = lecture_data["slides"][0]
    assert "title" in slide1
    assert "bullets" in slide1["content"]
    assert len(slide1["narration_script"]) > 20

    # 4. Fetch the generated lecture with all presentation slides
    get_res = await client.get(
        f"/api/v1/professor/courses/{course_id}/lectures/{lecture_id}"
    )
    assert get_res.status_code == 200
    assert len(get_res.json()["slides"]) == lecture_data["slide_count"]

    # 5. Ask AI Tutor about slide 1
    ask_payload = {
        "slide_number": 1,
        "question": "What is the primary role of an operating system?",
    }
    ask_res = await client.post(
        f"/api/v1/professor/courses/{course_id}/lectures/{lecture_id}/ask",
        json=ask_payload,
    )
    assert ask_res.status_code == 200
    answer_data = ask_res.json()
    assert "answer" in answer_data
    assert len(answer_data["answer"]) > 10
    assert answer_data["slide_number"] == 1

    # 6. Verify student access
    client_s = CsrfAwareClient(transport=ASGITransport(app=app), base_url="http://test")
    student_data = {
        "email": "ash@example.edu",
        "password": "Password123!",
        "full_name": "Ash Ketchum",
        "role": "STUDENT",
    }
    s_reg = await client_s.post("/api/v1/auth/register", json=student_data)
    assert s_reg.status_code == 201

    # Student fetches the lecture presentation
    s_lec_res = await client_s.get(f"/api/v1/student/lectures/{lecture_id}")
    assert s_lec_res.status_code == 200
    assert s_lec_res.json()["slide_count"] == lecture_data["slide_count"]

    # Student asks AI Tutor a question during the presentation
    s_ask_res = await client_s.post(
        f"/api/v1/student/lectures/{lecture_id}/ask",
        json={"slide_number": 2, "question": "Why is thread synchronization needed?"},
    )
    assert s_ask_res.status_code == 200
    assert len(s_ask_res.json()["answer"]) > 10

    await client_s.aclose()
