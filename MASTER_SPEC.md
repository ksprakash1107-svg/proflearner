# MASTER_SPEC.md

**Product:** ProfLearn — AI-Powered Professor-Based Learning Platform (working name; configurable via `APP_NAME`)
**Document version:** 1.0 (MVP)
**Audience:** Antigravity (AI coding agent) and human reviewers
**Status:** Primary source of truth for the MVP implementation

---

## Table of Contents

0. Document Conventions
1. Executive Summary
2. Product Vision
3. Problem Statement
4. Goals and Non-Goals
5. Scope and Priority Matrix
6. User Roles and Permissions
7. Functional Requirements
8. Non-Functional Requirements
9. User Journeys
10. User Stories and Acceptance Criteria
11. System Architecture
12. Technology Stack
13. Domain Model and Status Lifecycles
14. Database Design (including ER diagram)
15. Authentication and Authorization
16. Document Processing Pipeline
17. Background Jobs
18. RAG Architecture
19. AI Architecture
20. Prompt Architecture
21. Lecture Generation and Slide Format
22. AI Tutor (Context-Aware Q&A)
23. TTS and Voice
24. API Specification
25. Frontend Routes and Guards
26. UI/UX Requirements
27. Security
28. Privacy and Consent
29. Error Handling
30. Observability
31. Performance and Cost Control
32. Audit Logging
33. Testing Strategy
34. Development Environment and Environment Variables
35. Project Structure
36. Deployment
37. MVP Acceptance Criteria
38. Roadmap (MVP and Future)
39. Definition of Done
40. Implementation Plan
41. ANTIGRAVITY BUILD INSTRUCTIONS
42. Code Quality Requirements
43. Appendix: Consistency Matrix

---

## 0. Document Conventions

### 0.1 Priority legend

| Tag | Meaning |
|---|---|
| **P0** | Critical for MVP. Must be implemented and working. |
| **P1** | Important after MVP. Schema/architecture must not block it. Do NOT implement during MVP phases. |
| **P2** | Future. Documented only. |

Every feature in this document carries a priority. P1/P2 items must never complicate P0 code paths.

### 0.2 Terminology (used consistently throughout)

| Term | Definition |
|---|---|
| **Course** | A container owned by one professor. Contains units. |
| **Unit** | An ordered section of a course. Contains documents and lectures. |
| **Document** | An uploaded PDF belonging to a unit. |
| **Chunk** | A page-aware text segment of a document with an embedding. |
| **Lecture** | An AI-generated, professor-reviewed learning experience built from one document. Contains slides. |
| **Slide** | A structured, renderable teaching screen with narration script and audio. |
| **Narration** | The spoken audio (TTS) generated from a slide's narration script. |
| **AI Teaching Assistant** | The product-facing name of the tutor: "AI teaching assistant for Professor X's course". |
| **Teaching Profile** | A professor-defined JSON configuration controlling generation and tutoring style. |
| **Grounded answer** | An answer derived from retrieved course material or the current slide. |
| **Job** | A background task stored in the `jobs` table and executed by the worker. |

### 0.3 Explicit assumptions

| ID | Assumption |
|---|---|
| A1 | Single-deployment, single-tenant platform. No organization/tenant isolation beyond course-level isolation. |
| A2 | Uploaded PDFs contain a selectable text layer. Scanned/image-only PDFs are rejected with `NO_TEXT_LAYER` in the MVP (OCR is P1). |
| A3 | Primary content language is English. The `language` field exists in the Teaching Profile; multilingual quality assurance is P1. |
| A4 | OpenAI model names are configuration values (see §19.4). Defaults listed in this document must be verified against currently available models at implementation time. |
| A5 | Enrollment is open self-enrollment in the MVP (no enrollment codes, no approval). |
| A6 | Professors self-register and are active immediately. Admin can deactivate. Professor approval workflow is P1. |
| A7 | MVP scale: ≤ 50 professors, ≤ 1,000 students, ≤ 100 concurrent students, documents ≤ 300 pages / 25 MB. |
| A8 | PostgreSQL 16 with `pgvector` ≥ 0.8 (iterative index scan support) and `citext`, `pgcrypto` extensions. |
| A9 | One lecture is generated from exactly one document. Multi-document lectures are P1. |
| A10 | Email is sent via SMTP (`SMTP_*` variables). In development, Mailpit captures email. |
| A11 | Admin accounts are never created via public registration. They are created via seed script / CLI (`scripts/create_admin.py`). |
| A12 | Page numbers are 1-based and correspond to the PDF's physical page index. |

---

## 1. Executive Summary

ProfLearn converts a professor's uploaded PDF course material into an interactive, slide-based lecture with AI-generated narration. Students watch the lecture, pause at any moment, and ask questions. The AI Teaching Assistant answers in the context of the exact slide being viewed, grounded in the professor's own material via Retrieval-Augmented Generation (RAG).

The MVP proves one hypothesis:

> A professor can upload course material, and a student can learn from an AI-generated interactive lecture while asking contextual questions without leaving the platform.

Core flow (the heart of the architecture):

```
Professor → Course → Unit → PDF → Document Processing → RAG Knowledge Base
→ AI Lecture Generation → Slides + Narration → Student Lecture Player
→ Current Context → Student Question → RAG Retrieval → AI Tutor → Grounded Answer
```

## 2. Product Vision

- A professor supplies teaching material; the platform produces a structured lecture with slides, explanations, equations/diagrams where appropriate, and spoken narration.
- A student learns at their own pace and asks "Why does this happen?" without specifying which slide; the platform supplies the slide, lecture, unit, course, retrieved sources, and teaching profile as context.
- Long-term (Phase 2+): optional professor-specific voice with explicit, revocable consent. **The MVP uses a standard AI voice and has no dependency on voice cloning.**

**Differentiator.** The product is not "ChatGPT for students". It preserves the relationship **Professor → Course → Material → Lecture → Student → Contextual AI Tutor**, and answers are grounded in the professor's uploaded material.

**Product language rules (mandatory in UI copy and prompts):**

| Use | Never use |
|---|---|
| "AI teaching assistant for Professor X's course" | "Professor X is teaching you live" |
| "Learn from your professor's course material" | "Talk to Professor X" |
| "AI explanation based on the current lecture" | Any implication that the AI *is* the professor |
| "AI-generated voice" label near the audio controls | Implying affiliation with a university without authorization |

## 3. Problem Statement

- Static PDFs are passive; students cannot interrogate them in context.
- Generic chatbots lack course context, hallucinate course facts, and are disconnected from what the professor actually teaches.
- Professors lack a low-effort way to convert existing material into an engaging, interactive format that they control and review.

## 4. Goals and Non-Goals

### 4.1 Goals (MVP)

1. Deliver the complete vertical slice in §37 end-to-end.
2. Ground tutor answers in course material with visible source references.
3. Keep the professor in control: generated content is a draft until reviewed and published.
4. Enforce strict role and course isolation on the server.
5. Keep AI providers replaceable behind an abstraction.
6. Keep AI cost bounded and observable.

### 4.2 Non-Goals (MVP)

Voice cloning, photorealistic avatars, video generation, mobile apps, payments, social features, recommendation engines, gamification, live classrooms, advanced analytics, marketplace, multi-tenant enterprise architecture, proctoring, complex notification infrastructure, OCR, PPTX export, quizzes (prompt template documented, not built).

## 5. Scope and Priority Matrix

| Area | P0 (MVP) | P1 (after MVP) | P2 (future) |
|---|---|---|---|
| Auth | Register, login, logout, refresh, me, password reset, change password, lockout, role guards | Email verification, professor approval, admin role changes | SSO/OAuth, MFA |
| Courses | CRUD (soft delete/archive), units CRUD, publish/unpublish course, teaching profile | Unit reordering UI, thumbnail upload, enrollment codes | Course templates |
| Documents | PDF upload, validation, dedupe, async processing, status, retry, delete | Multi-document lectures, OCR, figure extraction | DOCX/PPTX ingestion |
| Lectures | Generate from 1 document, review, edit slide text/narration, approve, publish/unpublish, delete | Regenerate single slide, add/delete/reorder slides, version history | PPTX export |
| Narration | Per-slide TTS (standard voice), regenerate on edit | Voice selection per course, multilingual narration | Professor voice cloning with consent |
| Player | Slides, audio, play/pause, prev/next, speed, transcript, progress, Ask AI | Keyboard shortcut help, offline captions download | Mic input, avatar, realtime voice |
| Tutor | RAG Q&A with slide context, citations, quota, history | Streaming (SSE), answer feedback, bookmarks, answer cache, moderation API | Realtime voice tutor, quiz mode |
| Progress | Per-lecture progress, course progress, completion | Streaks, study plans | Recommendations |
| Professor dashboard | Courses, draft/published lectures, jobs, recent questions, basic engagement | Per-slide confusion analytics | Advanced analytics |
| Admin | Dashboard stats, user list/activate/deactivate, course moderation (unpublish/archive), documents metadata, failed jobs, audit logs | Role changes, reported content, platform settings UI, question moderation | Billing, institutional controls |
| Ops | Docker Compose, Alembic, structured logs, health checks, seed data | Prometheus `/metrics`, Sentry | Autoscaling workers |

---

## 6. User Roles and Permissions

Exactly three application roles: **ADMIN**, **PROFESSOR**, **STUDENT**. Stored as `users.role` (enum). There is no `roles` table (a fixed 3-value enum is simpler and sufficient; this is a deliberate decision). Role is assigned at registration (PROFESSOR or STUDENT only) or by CLI (ADMIN) and is never accepted from request bodies after registration.

### 6.1 Permission matrix

Legend: ✔ allowed · **own** = only resources the user owns · **enrolled** = only courses the student is enrolled in · **meta** = metadata only, no content · — = forbidden.

| Capability | ADMIN | PROFESSOR | STUDENT | Priority |
|---|---|---|---|---|
| Register / login / logout / reset password | ✔ (login only) | ✔ | ✔ | P0 |
| Edit own profile | ✔ | ✔ | ✔ | P0 |
| Upload profile photo | — | ✔ | — | P1 |
| View platform statistics | ✔ | — | — | P0 |
| List / view users (email, name, role, status) | ✔ | — | — | P0 |
| Activate / deactivate users | ✔ (not self, not last admin) | — | — | P0 |
| Change user role | ✔ | — | — | P1 |
| View audit logs | ✔ | — | — | P0 |
| Create / edit / archive courses | — | **own** | — | P0 |
| Unpublish / archive any course (moderation) | ✔ (reason required) | — | — | P0 |
| View course metadata, units, lecture titles | ✔ | **own** | published courses (browse); full if **enrolled** | P0 |
| Create units | — | **own** | — | P0 |
| Upload / delete documents | — | **own** | — | P0 |
| View documents metadata | ✔ **meta** | **own** | — | P0 |
| Download original PDF | — | **own** | — | P0 |
| Generate / edit / approve / publish lectures | — | **own** | — | P0 |
| View lecture slides and audio | — | **own** (any status) | **enrolled** and `PUBLISHED` only | P0 |
| Preview lecture content (moderation) | ✔ read-only | — | — | P1 |
| Configure teaching profile | — | **own** | — | P0 |
| Enroll in courses | — | — | ✔ (published courses) | P0 |
| Ask AI tutor questions | — | — | **enrolled** | P0 |
| View student questions | — | **own** courses (name + question text, no email) | **own** questions | P0 |
| View student progress | — | **own** courses (aggregate + per-student name/progress) | **own** | P0 |
| View student email/PII | ✔ (user list only) | — | — | P0 |
| View AI usage logs | ✔ (aggregate) | — | — | P0 |

---

## 11. System Architecture

### 11.1 Components

| Component | Responsibility |
|---|---|
| **Frontend (Next.js)** | UI, routing, role-based layouts, lecture player, API client. Proxies `/api/v1/*` to backend via Next.js rewrites so cookies are first-party. |
| **Backend API (FastAPI)** | Auth, authorization, CRUD, upload handling, enqueue jobs, tutor Q&A orchestration, presigned URL issuance. |
| **Worker (same codebase, separate process)** | Executes jobs: document processing, lecture generation, audio generation, storage cleanup. |
| **PostgreSQL + pgvector** | System of record, vector store, job queue, audit logs. |
| **Object storage (S3-compatible)** | PDFs, narration audio, images. Private bucket; access only via short-lived presigned URLs issued after authorization. |
| **AI provider (OpenAI)** | LLM, embeddings, TTS behind `AIProvider` abstraction. |
| **SMTP (Mailpit in dev)** | Password-reset email. |

---

## 34. Development Environment and Environment Variables

### 34.6 `.env.example`

```dotenv
APP_ENV=development
APP_NAME=ProfLearn
LOG_LEVEL=INFO
DATABASE_URL=postgresql+asyncpg://proflearn:proflearn@db:5432/proflearn
AUTH_SECRET=change-me-to-a-random-string-of-at-least-32-characters
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:3000
AI_PROVIDER=fake
OPENAI_API_KEY=
LLM_MODEL_SMALL=gpt-4.1-mini
LLM_MODEL_MEDIUM=gpt-4.1-mini
LLM_MODEL_LARGE=gpt-4.1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
TTS_MODEL=gpt-4o-mini-tts
TTS_DEFAULT_VOICE=alloy
STORAGE_ENDPOINT=http://minio:9000
STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=proflearn
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=no-reply@proflearn.local
SMTP_TLS=false
ADMIN_SEED_EMAIL=admin@example.edu
ADMIN_SEED_PASSWORD=ChangeMe123!
BACKEND_INTERNAL_URL=http://backend:8000
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_APP_NAME=ProfLearn
```

*(Refer to MASTER_SPEC in prompt for all remaining sections)*
