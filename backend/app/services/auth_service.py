import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    UnauthorizedError,
    ValidationFailed,
)
from app.core.security import (
    create_access_token,
    generate_csrf_token,
    generate_secure_token,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
)
from app.db.enums import UserRole
from app.db.models.auth import (
    DEFAULT_TEACHING_PROFILE,
    PasswordResetToken,
    ProfessorProfile,
    RefreshToken,
    StudentProfile,
    User,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    PasswordResetConfirmRequest,
    RegisterRequest,
    UserDTO,
    UserProfileSummary,
)
from app.services.audit_service import AuditService
from app.services.email_service import EmailService


class AuthService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.email_service = EmailService()

    def user_to_dto(self, user: User) -> UserDTO:
        profile_summary = None
        if user.role in (UserRole.PROFESSOR, "PROFESSOR") and user.professor_profile:
            p = user.professor_profile
            profile_summary = UserProfileSummary(
                title=p.title,
                institution=p.institution,
                department=p.department,
                bio=p.bio,
                default_teaching_profile=p.default_teaching_profile,
            )
        elif user.role in (UserRole.STUDENT, "STUDENT") and user.student_profile:
            s = user.student_profile
            profile_summary = UserProfileSummary(
                institution=s.institution,
                program=s.program,
                preferred_language=s.preferred_language,
            )

        return UserDTO(
            id=user.id,
            email=str(user.email),
            full_name=user.full_name,
            role=str(user.role),
            is_active=user.is_active,
            created_at=user.created_at,
            profile=profile_summary,
        )

    async def register(
        self, session: AsyncSession, data: RegisterRequest, request: Request | None = None
    ) -> tuple[UserDTO, str, str, str]:
        if data.role == UserRole.ADMIN or data.role == "ADMIN":
            raise ValidationFailed(
                message="Cannot register as an administrator.",
                details=[{"field": "role", "issue": "ADMIN role cannot be registered"}],
                code="INVALID_ROLE",
            )

        # 1. Check existing user
        existing = await session.execute(select(User).where(User.email == data.email.lower()))
        if existing.scalar_one_or_none():
            raise ConflictError(
                code="EMAIL_ALREADY_REGISTERED",
                message="An account with this email already exists.",
            )

        # 2. Validate password
        validate_password_policy(data.password, email=data.email)

        # 3. Create user
        user = User(
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
            full_name=data.full_name.strip(),
            role=data.role,
            is_active=True,
            token_version=0,
        )
        session.add(user)
        await session.flush()

        # 4. Create profile
        if data.role in (UserRole.PROFESSOR, "PROFESSOR"):
            prof_profile = ProfessorProfile(
                user_id=user.id,
                default_teaching_profile=DEFAULT_TEACHING_PROFILE.copy(),
            )
            session.add(prof_profile)
            user.professor_profile = prof_profile
        else:
            student_profile = StudentProfile(
                user_id=user.id,
                preferred_language="en",
            )
            session.add(student_profile)
            user.student_profile = student_profile

        # 5. Create refresh token
        raw_refresh, token_hash = generate_secure_token()
        family_id = uuid.uuid4()
        now = datetime.now(UTC)
        refresh_token_entry = RefreshToken(
            user_id=user.id,
            family_id=family_id,
            token_hash=token_hash,
            expires_at=now + timedelta(days=self.settings.REFRESH_TOKEN_TTL_DAYS),
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent")[:300]
            if request and request.headers.get("user-agent")
            else None,
        )
        session.add(refresh_token_entry)

        # 6. Audit
        await AuditService.record(
            session,
            action="USER_REGISTERED",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            metadata={"role": user.role},
            request=request,
        )
        await AuditService.record(
            session,
            action="LOGIN_SUCCESS",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            request=request,
        )

        await session.commit()

        # Load fresh user with profiles
        stmt = (
            select(User)
            .where(User.id == user.id)
            .options(selectinload(User.professor_profile), selectinload(User.student_profile))
        )
        user_loaded = (await session.execute(stmt)).scalar_one()

        access_token = create_access_token(
            user_loaded.id, user_loaded.role, user_loaded.token_version
        )
        csrf_token = generate_csrf_token()

        return self.user_to_dto(user_loaded), access_token, raw_refresh, csrf_token

    async def login(
        self, session: AsyncSession, email: str, password: str, request: Request | None = None
    ) -> tuple[UserDTO, str, str, str]:
        email_clean = email.lower().strip()
        stmt = (
            select(User)
            .where(User.email == email_clean)
            .options(selectinload(User.professor_profile), selectinload(User.student_profile))
        )
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        now = datetime.now(UTC)

        if not user:
            # Audit failed attempt with hashed email
            await AuditService.record(
                session,
                action="LOGIN_FAILED",
                metadata={
                    "email_hash": AuditService.hash_email(email_clean),
                    "reason": "USER_NOT_FOUND",
                },
                request=request,
            )
            await session.commit()
            raise UnauthorizedError(
                code="INVALID_CREDENTIALS",
                message="Incorrect email or password.",
            )

        # Check account lockout
        if user.locked_until and user.locked_until > now:
            raise ForbiddenError(
                code="ACCOUNT_LOCKED",
                message="Too many attempts. Try again in 15 minutes.",
            )

        # Verify password
        if not verify_password(password, user.password_hash):
            user.failed_login_count += 1
            if user.failed_login_count >= 5:
                user.locked_until = now + timedelta(minutes=15)
                await AuditService.record(
                    session,
                    action="LOGIN_FAILED",
                    actor=user,
                    metadata={"reason": "ACCOUNT_LOCKED_THRESHOLD"},
                    request=request,
                )
                await session.commit()
                raise ForbiddenError(
                    code="ACCOUNT_LOCKED",
                    message="Too many attempts. Try again in 15 minutes.",
                )

            await AuditService.record(
                session,
                action="LOGIN_FAILED",
                actor=user,
                metadata={"reason": "INVALID_PASSWORD"},
                request=request,
            )
            await session.commit()
            raise UnauthorizedError(
                code="INVALID_CREDENTIALS",
                message="Incorrect email or password.",
            )

        # Check deactivation (§15.1: revealed only after correct password)
        if not user.is_active:
            raise ForbiddenError(
                code="ACCOUNT_DEACTIVATED",
                message="This account has been deactivated. Contact support.",
            )

        # Reset failures and record login
        user.failed_login_count = 0
        user.locked_until = None
        user.last_login_at = now

        # Create refresh token
        raw_refresh, token_hash = generate_secure_token()
        family_id = uuid.uuid4()
        refresh_token_entry = RefreshToken(
            user_id=user.id,
            family_id=family_id,
            token_hash=token_hash,
            expires_at=now + timedelta(days=self.settings.REFRESH_TOKEN_TTL_DAYS),
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent")[:300]
            if request and request.headers.get("user-agent")
            else None,
        )
        session.add(refresh_token_entry)

        await AuditService.record(
            session,
            action="LOGIN_SUCCESS",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            request=request,
        )
        await session.commit()

        access_token = create_access_token(user.id, user.role, user.token_version)
        csrf_token = generate_csrf_token()

        return self.user_to_dto(user), access_token, raw_refresh, csrf_token

    async def refresh(
        self, session: AsyncSession, raw_refresh_token: str, request: Request | None = None
    ) -> tuple[UserDTO, str, str, str]:
        token_hash = hash_token(raw_refresh_token)
        now = datetime.now(UTC)

        stmt = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .options(
                selectinload(RefreshToken.user).selectinload(User.professor_profile),
                selectinload(RefreshToken.user).selectinload(User.student_profile),
            )
        )
        result = await session.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            raise UnauthorizedError(
                code="REFRESH_TOKEN_INVALID",
                message="Your session expired. Please sign in again.",
            )

        # Reuse detection: if token is already revoked, revoke entire family
        if token_record.revoked_at is not None:
            await session.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == token_record.family_id)
                .values(revoked_at=now)
            )
            await AuditService.record(
                session,
                action="REFRESH_REUSE_DETECTED",
                actor=token_record.user,
                metadata={"family_id": str(token_record.family_id)},
                request=request,
            )
            await session.commit()
            raise UnauthorizedError(
                code="REFRESH_TOKEN_INVALID",
                message="Your session expired. Please sign in again.",
            )

        if token_record.expires_at < now:
            raise UnauthorizedError(
                code="REFRESH_TOKEN_INVALID",
                message="Your session expired. Please sign in again.",
            )

        user = token_record.user
        if not user.is_active:
            raise ForbiddenError(
                code="ACCOUNT_DEACTIVATED",
                message="This account has been deactivated. Contact support.",
            )

        # Rotate token
        token_record.revoked_at = now
        new_raw_refresh, new_token_hash = generate_secure_token()
        new_token_record = RefreshToken(
            user_id=user.id,
            family_id=token_record.family_id,
            token_hash=new_token_hash,
            expires_at=now + timedelta(days=self.settings.REFRESH_TOKEN_TTL_DAYS),
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent")[:300]
            if request and request.headers.get("user-agent")
            else None,
        )
        session.add(new_token_record)
        await session.flush()
        token_record.replaced_by_id = new_token_record.id

        await session.commit()

        access_token = create_access_token(user.id, user.role, user.token_version)
        csrf_token = generate_csrf_token()

        return self.user_to_dto(user), access_token, new_raw_refresh, csrf_token

    async def logout(
        self,
        session: AsyncSession,
        user: User,
        raw_refresh_token: str | None = None,
        request: Request | None = None,
    ) -> None:
        now = datetime.now(UTC)
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            await session.execute(
                update(RefreshToken)
                .where(RefreshToken.token_hash == token_hash)
                .values(revoked_at=now)
            )

        await AuditService.record(
            session,
            action="LOGOUT",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            request=request,
        )
        await session.commit()

    async def request_password_reset(
        self, session: AsyncSession, email: str, request: Request | None = None
    ) -> None:
        email_clean = email.lower().strip()
        result = await session.execute(select(User).where(User.email == email_clean))
        user = result.scalar_one_or_none()

        if user and user.is_active:
            raw_token, token_hash = generate_secure_token()
            now = datetime.now(UTC)
            reset_record = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=now + timedelta(hours=1),
            )
            session.add(reset_record)
            await AuditService.record(
                session,
                action="PASSWORD_RESET_REQUESTED",
                actor=user,
                resource_type="user",
                resource_id=user.id,
                request=request,
            )
            await session.commit()

            await self.email_service.send_password_reset_email(user.email, raw_token)

    async def confirm_password_reset(
        self,
        session: AsyncSession,
        data: PasswordResetConfirmRequest,
        request: Request | None = None,
    ) -> None:
        token_hash = hash_token(data.token)
        now = datetime.now(UTC)

        stmt = (
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .options(selectinload(PasswordResetToken.user))
        )
        result = await session.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record or token_record.used_at is not None or token_record.expires_at < now:
            raise BadRequestError(
                code="RESET_TOKEN_INVALID",
                message="This reset link is invalid or expired.",
            )

        user = token_record.user
        validate_password_policy(data.new_password, email=str(user.email))

        user.password_hash = hash_password(data.new_password)
        user.token_version += 1
        user.locked_until = None
        user.failed_login_count = 0
        token_record.used_at = now

        # Revoke all refresh tokens
        await session.execute(
            update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked_at=now)
        )

        await AuditService.record(
            session,
            action="PASSWORD_CHANGED",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            request=request,
        )
        await session.commit()

    async def change_password(
        self,
        session: AsyncSession,
        user: User,
        data: ChangePasswordRequest,
        request: Request | None = None,
    ) -> None:
        if not verify_password(data.current_password, user.password_hash):
            raise BadRequestError(
                code="INVALID_CURRENT_PASSWORD",
                message="Current password is incorrect.",
            )

        validate_password_policy(data.new_password, email=str(user.email))
        now = datetime.now(UTC)

        user.password_hash = hash_password(data.new_password)
        user.token_version += 1

        # Revoke other sessions (all refresh tokens)
        await session.execute(
            update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked_at=now)
        )

        await AuditService.record(
            session,
            action="PASSWORD_CHANGED",
            actor=user,
            resource_type="user",
            resource_id=user.id,
            request=request,
        )
        await session.commit()

    async def dev_bypass(
        self, session: AsyncSession, role: str, request: Request | None = None
    ) -> tuple[UserDTO, str, str, str]:
        role_upper = role.upper()
        if role_upper not in ("PROFESSOR", "STUDENT", "ADMIN"):
            role_upper = "PROFESSOR"

        email = f"dev_{role_upper.lower()}@proflearn.local"
        if role_upper == "ADMIN":
            email = self.settings.ADMIN_SEED_EMAIL

        stmt = (
            select(User)
            .where(User.email == email)
            .options(selectinload(User.professor_profile), selectinload(User.student_profile))
        )
        user = (await session.execute(stmt)).scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                password_hash=hash_password("DevMaster123!"),
                full_name=f"Master Dev {role_upper.capitalize()}",
                role=role_upper,
                is_active=True,
            )
            session.add(user)
            await session.flush()

            if role_upper == "PROFESSOR":
                prof_profile = ProfessorProfile(
                    user_id=user.id,
                    title="Distinguished Professor",
                    institution="ProfLearn University",
                    department="Computer Science & Engineering",
                    bio="Master Dev Professor for local testing & interactive AI teaching.",
                )
                session.add(prof_profile)
            elif role_upper == "STUDENT":
                student_profile = StudentProfile(
                    user_id=user.id,
                    program="Computer Science B.S.",
                )
                session.add(student_profile)
            await session.commit()

            user = (await session.execute(stmt)).scalar_one()

        # Generate fresh tokens
        now = datetime.now(UTC)
        raw_refresh, token_hash = generate_secure_token()
        refresh_row = RefreshToken(
            user_id=user.id,
            family_id=uuid.uuid4(),
            token_hash=token_hash,
            expires_at=now + timedelta(days=self.settings.REFRESH_TOKEN_TTL_DAYS),
        )
        session.add(refresh_row)
        user.last_login_at = now
        await session.commit()

        user_loaded = (await session.execute(stmt)).scalar_one()
        access_token = create_access_token(
            user_loaded.id, user_loaded.role, user_loaded.token_version
        )
        csrf_token = generate_csrf_token()
        return self.user_to_dto(user_loaded), access_token, raw_refresh, csrf_token

