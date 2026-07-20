# Wedding Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organisers upload wedding photos per event and let public guests browse and download originals, while fixing the mobile budget totals alignment.

**Architecture:** The FastAPI service issues authenticated S3 presigned PUT URLs and persists confirmed object metadata in SQLite. The React planner uploads directly to S3 with progress; the public invitation consumes a read-only gallery endpoint and renders event albums.

**Tech Stack:** FastAPI, SQLAlchemy/SQLite, boto3, React, TypeScript, Vitest, pytest.

## Global Constraints

- Store originals in the existing SDrive bucket under `wedding-photos/{event-slug}/`.
- Accept JPEG, PNG, and WebP images only, up to 25 MB per image.
- Public users can browse and download; only authenticated organisers can upload/delete.
- Work directly on `main` as requested by the user.

---

### Task 1: Gallery API and storage integration

**Files:** `api/app/main.py`, `api/requirements.txt`, `api/.env.example`, `api/tests/test_gallery.py`

- [ ] Add failing tests for authenticated upload preparation/confirmation/deletion and public event-grouped reads.
- [ ] Add a `GalleryPhoto` table and `POST /gallery/uploads`, `POST /gallery/confirm`, `GET /gallery`, `DELETE /gallery/{id}`, and `GET /public/gallery`.
- [ ] Generate presigned S3 PUT URLs, validate event/file data and prefix ownership, record only confirmed objects, and delete objects and rows together.
- [ ] Run `pytest api/tests -q`.

### Task 2: Planner gallery and public albums

**Files:** `src/api.ts`, `src/App.tsx`, `src/guest-manager.css`, `tests/App.test.tsx`

- [ ] Add failing UI tests for the Gallery tab and public album/gallery rendering.
- [ ] Add API client types/methods, direct-XHR upload progress, planner event picker/multi-file upload/delete flow, and public event albums with viewer/download links.
- [ ] Add responsive album/grid/viewer styling and accessible upload/error states.
- [ ] Run `npm test -- --run` and `npm run build`.

### Task 3: Budget mobile layout regression

**Files:** `src/guest-manager.css`, `tests/App.test.tsx`

- [ ] Add a regression assertion that totals use a constrained three-column grid class.
- [ ] Use `repeat(3, minmax(0, 1fr))`, equal gutters, minimum-width constraints, and responsive amount sizing.
- [ ] Run frontend tests and build.

### Task 4: Deployment verification

**Files:** VM environment and bucket CORS configuration only.

- [ ] Set AWS bucket variables in the API VM `.env` without committing secrets, add the bucket CORS rule for the wedding domain, and rebuild the API container.
- [ ] Deploy the frontend, then verify upload, public browsing/download, deletion, and 360/412/588 px mobile rendering against live services.
