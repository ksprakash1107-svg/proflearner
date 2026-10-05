# ProfLearn Architecture & Technical Notes

This document describes technical decisions and operational patterns for ProfLearn, supplementing `MASTER_SPEC.md`.

## System Overview

ProfLearn is structured as a vertical platform:
- **Backend API (FastAPI)**: Stateless HTTP server handling authentication, domain CRUD, file upload processing, student Q&A orchestration, and generating presigned URLs.
- **Worker**: Separate process sharing the backend codebase, polling the PostgreSQL `jobs` table using `SELECT ... FOR UPDATE SKIP LOCKED`.
- **Database (PostgreSQL 16/17 + pgvector)**: System of record, vector store with HNSW indexing, job queue, and append-only audit logs.
- **Object Storage (S3-compatible)**: Private storage for original PDF documents, generated slide narration MP3s, and static assets.
- **Frontend (Next.js 15 App Router)**: React 19 UI with Tailwind CSS 4 and shadcn/ui components. Proxies `/api/v1/*` requests to the FastAPI backend.

## AI Provider Integration

All AI capabilities (text generation, structured output, embeddings, and speech synthesis) are abstracted behind the `AIProvider` protocol (`app/ai/provider.py`).
- In production, `OpenAIProvider` handles LLM, embedding, and TTS requests.
- In development and CI testing, `FakeAIProvider` allows full offline operation without incurring API costs.
