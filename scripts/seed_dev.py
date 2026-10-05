#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.enums import UserRole
from app.db.models.auth import (
    DEFAULT_TEACHING_PROFILE,
    ProfessorProfile,
    StudentProfile,
    User,
)
from app.db.session import async_session_factory


async def seed() -> None:
    settings = get_settings()
    if settings.APP_ENV == "production":
        print("Error: Seed script cannot run in production environment.", file=sys.stderr)
        sys.exit(1)

    print("Seeding initial development users...")
    async with async_session_factory() as session:
        # 1. Admin
        admin_res = await session.execute(
            select(User).where(User.email == settings.ADMIN_SEED_EMAIL.lower().strip())
        )
        if not admin_res.scalar_one_or_none():
            admin_user = User(
                email=settings.ADMIN_SEED_EMAIL.lower().strip(),
                password_hash=hash_password(settings.ADMIN_SEED_PASSWORD),
                full_name="Platform Administrator",
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin_user)
            print(f"Created Admin: {settings.ADMIN_SEED_EMAIL}")

        # 2. Professor
        prof_res = await session.execute(select(User).where(User.email == "prof@example.edu"))
        if not prof_res.scalar_one_or_none():
            prof_user = User(
                email="prof@example.edu",
                password_hash=hash_password("Password123!"),
                full_name="Dr. Demo Professor",
                role=UserRole.PROFESSOR,
                is_active=True,
            )
            session.add(prof_user)
            await session.flush()

            prof_profile = ProfessorProfile(
                user_id=prof_user.id,
                title="Dr.",
                institution="Demo University",
                department="Computer Science & Physics",
                bio="Passionate educator exploring AI-assisted learning.",
                default_teaching_profile=DEFAULT_TEACHING_PROFILE.copy(),
            )
            session.add(prof_profile)
            print("Created Professor: prof@example.edu")

        # 3. Student
        student_res = await session.execute(select(User).where(User.email == "student@example.edu"))
        if not student_res.scalar_one_or_none():
            student_user = User(
                email="student@example.edu",
                password_hash=hash_password("Password123!"),
                full_name="Alex Student",
                role=UserRole.STUDENT,
                is_active=True,
            )
            session.add(student_user)
            await session.flush()

            student_profile = StudentProfile(
                user_id=student_user.id,
                institution="Demo University",
                program="Undergraduate Physics",
                preferred_language="en",
            )
            session.add(student_profile)
            print("Created Student: student@example.edu")

        await session.commit()
        print("Dev seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
