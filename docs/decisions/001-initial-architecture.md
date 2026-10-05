# 001. Initial System Architecture & Foundation

## Context
ProfLearn requires a reliable, performant, and maintainable foundation capable of processing PDF course materials, generating structured slides with audio narration, and supporting RAG-grounded contextual Q&A for students.

## Decision
1. **Monorepo Architecture**: Backend in FastAPI (Python 3.12) with asynchronous SQLAlchemy 2.0 and Alembic. Frontend in Next.js 15 App Router with React 19, Tailwind CSS 4, and TypeScript.
2. **Database-Backed Queue**: Background tasks use the PostgreSQL `jobs` table with `SELECT ... FOR UPDATE SKIP LOCKED` to avoid introducing external message broker dependencies (Redis/Kafka) for MVP scale.
3. **Pluggable AI & Storage Layers**: `AIProvider` and `StorageProvider` protocols enable offline development and deterministic unit testing using fake implementations while supporting OpenAI and S3/MinIO in production.
4. **Session Transport**: HttpOnly, Secure, SameSite=Lax cookies with JWT access tokens and opaque rotating refresh tokens, coupled with double-submit CSRF tokens.

## Consequences
- Single database dependency simplifies local setup and deployment.
- High testability without requiring live API keys or cloud storage during development.
