# ProfLearn

AI-Powered Professor-Based Learning Platform.

ProfLearn converts a professor's uploaded PDF course material into an interactive, slide-based lecture with AI-generated narration. Students watch the lecture, pause at any moment, and ask questions. The AI Teaching Assistant answers in the context of the exact slide being viewed, grounded in the professor's own material via Retrieval-Augmented Generation (RAG).

## Architecture

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 (async), Alembic, Pydantic v2.
- **Worker**: Python background worker polling PostgreSQL job queue.
- **Database**: PostgreSQL 16/17 with `pgvector`, `citext`, and `pgcrypto` extensions.
- **Object Storage**: S3-compatible (MinIO for development).
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui.
- **AI**: OpenAI API with provider abstraction (`FakeAIProvider` for local testing/dev).

## Quick Start (Local Development)

### Prerequisites

- Python 3.12+ (managed by `uv`)
- Node.js 20+ and `pnpm`
- PostgreSQL 16+ with `pgvector` extension

### 1. Environment Setup

```bash
cp .env.example .env
```

### 2. Backend Setup

```bash
cd backend
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Run the background worker in a separate terminal:
```bash
cd backend
uv run python -m app.worker
```

### 3. Frontend Setup

```bash
cd frontend
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Running with Docker Compose

```bash
docker compose up -d db minio minio-init mailpit
docker compose run --rm backend alembic upgrade head
docker compose up backend worker frontend
```

## Running Tests

```bash
cd backend
uv run pytest
```
