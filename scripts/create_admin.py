#!/usr/bin/env python3
import argparse
import asyncio
import getpass
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select
from app.core.security import hash_password, validate_password_policy
from app.db.enums import UserRole
from app.db.models.auth import User
from app.db.session import async_session_factory


async def create_admin(email: str, password: str, full_name: str) -> None:
    validate_password_policy(password, email=email)

    async with async_session_factory() as session:
        existing = await session.execute(select(User).where(User.email == email.lower().strip()))
        if existing.scalar_one_or_none():
            print(f"Error: User with email {email} already exists.", file=sys.stderr)
            sys.exit(1)

        admin_user = User(
            email=email.lower().strip(),
            password_hash=hash_password(password),
            full_name=full_name.strip(),
            role=UserRole.ADMIN,
            is_active=True,
            token_version=0,
        )
        session.add(admin_user)
        await session.commit()
        print(f"Admin account created successfully for {email}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a ProfLearn administrator account.")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--name", default="Platform Admin", help="Administrator full name")
    parser.add_argument("--password", help="Administrator password (prompted if omitted)")
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    full_name = args.name or input("Full name [Platform Admin]: ").strip() or "Platform Admin"
    password = args.password or getpass.getpass("Password: ")

    asyncio.run(create_admin(email, password, full_name))


if __name__ == "__main__":
    main()
