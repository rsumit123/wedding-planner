# Receipts, Venue Photos, and Event Sides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach multiple saved receipt images to vendors and venue images to functions, while classifying every function as bride, groom, or both.

**Architecture:** A generic attachment table associates private image records with vendor or event ids. Image bytes are stored under the existing persistent Docker `data/` mount and are only returned through authenticated API routes. Events gain a side column; the migration assigns groom to Reception and both to the existing other functions.

**Tech Stack:** FastAPI multipart uploads, SQLite, persistent Docker volume, React, TypeScript, pytest.

## Global Constraints

- Only organisers can upload, view, or delete attachments.
- Permit JPG, PNG, and WebP images up to 8 MB each.
- Receipts and venue photos never appear on the public invite.
- Existing Reception defaults to groom; existing Tilak, Haldi, and Wedding default to both.

---

### Task 1: Attachment and event-side backend

**Files:**
- Modify: `api/requirements.txt`
- Modify: `api/app/main.py`
- Create: `api/tests/test_attachments.py`
- Modify: `api/tests/test_events.py`

- [ ] Write failing multipart upload tests for a vendor and event image, authenticated image retrieval, and attachment deletion.
- [ ] Write a failing event-side assertion for `side: bride` round-tripping through create and update.
- [ ] Add the attachment table, persistent upload directory, strict file validation, authenticated image endpoint, and event side migration.
- [ ] Run `cd api && PYTHONPATH=. .venv/bin/pytest -q`.

### Task 2: Organiser attachment UI

**Files:**
- Modify: `src/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/guest-manager.css`

- [ ] Add attachment types and multipart client methods.
- [ ] Add Bride/Groom/Both selector to event add/edit.
- [ ] Add receipt/venue image pickers, upload status, protected thumbnail galleries, and per-image remove action.
- [ ] Run `npm test && npm run build`.

### Task 3: Deploy and verify

- [ ] Push main, rebuild only the wedding API container, and verify persistence in `/app/data/uploads`.
- [ ] Upload and retrieve temporary vendor and event images, verify event-side defaults, then delete only the temporary records.
