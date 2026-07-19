# Live Events, Tasks, and Vendor Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put task management in its own page, classify vendor costs by family side, and let organisers manage functions that automatically appear on the public invite.

**Architecture:** SQLite remains the source of truth. Events gain a venue field and CRUD endpoints; event creation adds the function to existing all-functions invitations, and deletion removes its invitation mappings. React loads event data from the API for the organiser screens and a public read-only endpoint for the invite page.

**Tech Stack:** FastAPI, SQLAlchemy/SQLite migrations, React, TypeScript, pytest, Vitest.

## Global Constraints

- Work and deploy directly from `main`.
- Vendor side must be exactly `bride`, `groom`, or `both`.
- Event deletion must remove only mappings for that event and retain guests, vendors, and tasks.
- Adding a function must add it to invitations marked `all_events`.
- All event changes must be visible on the public invite without a frontend redeploy.

---

### Task 1: Extend persistent API models

**Files:**
- Modify: `api/app/main.py`
- Create: `api/tests/test_events.py`
- Modify: `api/tests/test_vendors.py`

**Interfaces:**
- `EventIn`: `{name, date, time_note, venue}`.
- `VendorIn`: `{name, category, side, amount, paid_amount}`.
- New routes: `POST /events`, `PATCH /events/{id}`, `DELETE /events/{id}`, `GET /public/events`.

- [ ] Write tests for vendor side round-trip, event creation with venue, public event visibility, all-events invitations receiving a new event, and event deletion removing only that event mapping.
- [ ] Run `cd api && PYTHONPATH=. .venv/bin/pytest tests/test_events.py tests/test_vendors.py -q` and verify failure.
- [ ] Add SQLite startup migrations for `events.venue` and `vendors.side` with safe defaults, then implement CRUD and public event responses.
- [ ] Re-run the full API suite.

### Task 2: Move the task manager

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/App.test.tsx`

- [ ] Add a failing test that opening Tasks renders the add-task input and opening Today does not.
- [ ] Move the existing add/list/toggle implementation into a dedicated `TaskManager` view and leave Today with task navigation only.
- [ ] Run `npm test -- --run tests/App.test.tsx`.

### Task 3: Build event and vendor ownership management

**Files:**
- Modify: `src/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/guest-manager.css`

- [ ] Add API types and client methods for events, public events, and vendor side.
- [ ] Replace hard-coded event data with API-loaded event cards.
- [ ] Add event add/edit/delete controls with name, date, optional time note, and optional venue.
- [ ] Add Bride’s side / Groom’s side / Both selection to vendor add/edit and visible side badges in the vendor list.
- [ ] Run `npm test && npm run build`.

### Task 4: Make the public invite event-driven

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/guest-manager.css`

- [ ] Load `GET /public/events` when the public invite opens.
- [ ] Render live event names, dates, time notes, and venue only when supplied.
- [ ] Show a clear empty state if no functions are configured.
- [ ] Verify at 390px width that the public invite remains stacked and readable.

### Task 5: Deploy and verify

- [ ] Commit and push main.
- [ ] Copy `api/app/main.py` to the Socialflow wedding API directory and force-recreate only its Docker Compose container.
- [ ] Create, update, and delete a temporary function plus vendor; verify public events and all-functions invitation mappings; remove only temporary verification records.
