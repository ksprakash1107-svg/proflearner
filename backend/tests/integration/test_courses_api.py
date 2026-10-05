
import pytest
from httpx import ASGITransport

from app.main import app
from tests.conftest import CsrfAwareClient


@pytest.mark.asyncio
async def test_course_lifecycle_and_rules(
    client: CsrfAwareClient,
):
    # 1. Register Professor A
    prof_a_data = {
        "email": "prof_a@example.edu",
        "password": "Password123!",
        "full_name": "Professor Alpha",
        "role": "PROFESSOR",
    }
    res = await client.post("/api/v1/auth/register", json=prof_a_data)
    assert res.status_code == 201

    # 2. Register Professor B
    client_b = CsrfAwareClient(transport=ASGITransport(app=app), base_url="http://test")
    prof_b_data = {
        "email": "prof_b@example.edu",
        "password": "Password123!",
        "full_name": "Professor Beta",
        "role": "PROFESSOR",
    }
    res = await client_b.post("/api/v1/auth/register", json=prof_b_data)
    assert res.status_code == 201

    # 3. Register Student S
    client_s = CsrfAwareClient(transport=ASGITransport(app=app), base_url="http://test")
    student_data = {
        "email": "student_s@example.edu",
        "password": "Password123!",
        "full_name": "Student Sam",
        "role": "STUDENT",
    }
    res = await client_s.post("/api/v1/auth/register", json=student_data)
    assert res.status_code == 201

    # PR-5: Professor A creates a course
    course_payload = {
        "title": "Quantum Physics 101",
        "description": "Introduction to Quantum Mechanics and States",
        "subject": "Physics",
        "department": "Department of Physics",
    }
    res = await client.post("/api/v1/professor/courses", json=course_payload)
    assert res.status_code == 201
    course_data = res.json()
    course_id = course_data["id"]
    assert course_data["status"] == "DRAFT"
    assert course_data["title"] == "Quantum Physics 101"
    assert course_data["teaching_profile"]["teaching_style"] == "STEP_BY_STEP"

    # PR-12: Add Units to Course
    unit1_res = await client.post(
        f"/api/v1/professor/courses/{course_id}/units",
        json={"title": "Unit 1: Wave Functions", "description": "Basics of wave functions"},
    )
    assert unit1_res.status_code == 201
    assert unit1_res.json()["id"] is not None
    assert unit1_res.json()["position"] == 1

    unit2_res = await client.post(
        f"/api/v1/professor/courses/{course_id}/units",
        json={"title": "Unit 2: Schrödinger Equation", "description": "Time-dependent equation"},
    )
    assert unit2_res.status_code == 201
    assert unit2_res.json()["position"] == 2

    # Isolation Test: Professor B cannot see or modify Professor A's course
    b_get_res = await client_b.get(f"/api/v1/professor/courses/{course_id}")
    assert b_get_res.status_code == 404
    assert b_get_res.json()["error"]["code"] == "COURSE_NOT_FOUND"

    b_patch_res = await client_b.patch(
        f"/api/v1/professor/courses/{course_id}", json={"title": "Hacked Title"}
    )
    assert b_patch_res.status_code == 404

    # Student cannot see draft course
    student_courses_res = await client_s.get("/api/v1/student/courses")
    assert student_courses_res.status_code == 200
    assert len(student_courses_res.json()["items"]) == 0

    # Role guard: Student cannot access professor endpoints
    student_tamper = await client_s.post(
        "/api/v1/professor/courses", json={"title": "Illegal", "subject": "Test"}
    )
    assert student_tamper.status_code == 403
    assert student_tamper.json()["error"]["code"] == "FORBIDDEN_ROLE"

    # Publish course directly without blocker
    pub_res = await client.post(f"/api/v1/professor/courses/{course_id}/publish")
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # ST-3: Student can now find the published course
    student_courses_res2 = await client_s.get("/api/v1/student/courses?q=quantum")
    assert student_courses_res2.status_code == 200
    items = student_courses_res2.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == course_id
    assert items[0]["enrolled"] is False

    # ST-4: Student views course details
    s_detail = await client_s.get(f"/api/v1/student/courses/{course_id}")
    assert s_detail.status_code == 200
    assert s_detail.json()["enrolled"] is False
    assert len(s_detail.json()["units"]) == 2

    # ST-5: Student enrolls in course
    enroll_res = await client_s.post(f"/api/v1/student/courses/{course_id}/enroll")
    assert enroll_res.status_code == 200
    assert enroll_res.json()["status"] == "ENROLLED"

    # ST-5 Idempotency: Second enroll call returns 200
    enroll_res2 = await client_s.post(f"/api/v1/student/courses/{course_id}/enroll")
    assert enroll_res2.status_code == 200

    # ST-7: Student enrollments list
    my_enrollments = await client_s.get("/api/v1/student/enrollments")
    assert my_enrollments.status_code == 200
    assert len(my_enrollments.json()) == 1
    assert my_enrollments.json()[0]["course_id"] == course_id

    # PR-8 Rule: Course cannot be deleted if active student enrollments exist
    del_res = await client.delete(f"/api/v1/professor/courses/{course_id}")
    assert del_res.status_code == 409
    assert del_res.json()["error"]["code"] == "COURSE_HAS_ENROLLMENTS"

    # PR-11: Archive course instead
    archive_res = await client.post(f"/api/v1/professor/courses/{course_id}/archive")
    assert archive_res.status_code == 200
    assert archive_res.json()["status"] == "ARCHIVED"

    # Student cannot see archived course in catalog search
    cat_res = await client_s.get("/api/v1/student/courses")
    assert cat_res.status_code == 200
    assert len(cat_res.json()["items"]) == 0

    # Unarchive course: Restores course to active DRAFT
    unarchive_res = await client.post(f"/api/v1/professor/courses/{course_id}/unarchive")
    assert unarchive_res.status_code == 200
    assert unarchive_res.json()["status"] == "DRAFT"

    # Re-publish course
    repub_res = await client.post(f"/api/v1/professor/courses/{course_id}/publish")
    assert repub_res.status_code == 200
    assert repub_res.json()["status"] == "PUBLISHED"

    await client_b.aclose()
    await client_s.aclose()

