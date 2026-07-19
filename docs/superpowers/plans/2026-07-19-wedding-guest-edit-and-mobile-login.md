# Wedding Guest Editing and Mobile Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Vidai into the wedding ceremony, let organisers edit saved guests and their invitation scope, and make organiser login reliable on small screens.

**Architecture:** The FastAPI startup migration maps any existing Vidai invitations onto the wedding event and removes the redundant event. The guest API returns invitation selection with every guest and accepts one atomic update payload. The React screen reuses the guest form for add and edit modes; login uses its own scoped layout classes instead of public invitation styles.

**Tech Stack:** FastAPI, SQLAlchemy/SQLite, React, TypeScript, Vitest, pytest.

## Global Constraints

- Work directly on `main` and keep existing live data intact.
- Guest editing must update name, family side, and invitation functions together.
- Ceremony lists must contain Lagan & Tilak, Haldi & Matkor, Wedding ceremony, and Reception party only.
- Login must remain usable from a 320px-wide viewport.

---

### Task 1: Migrate Vidai and expose guest edits

**Files:**
- Modify: `api/app/main.py`
- Modify: `api/tests/test_guests.py`

**Interfaces:**
- Produces `PATCH /guests/{guest_id}` accepting `{name, side, all_events, event_ids}`.
- Produces `GET /guests` entries with `all_events` and `event_ids`.

- [ ] **Step 1: Write failing API tests**

```python
updated = client.patch(f'/guests/{guest["id"]}', json={
    'name': 'Verma family', 'side': 'groom', 'all_events': False, 'event_ids': [3],
})
assert updated.status_code == 200
listed = client.get('/guests').json()
assert listed[0]['side'] == 'groom'
assert listed[0]['event_ids'] == [3]
assert len(client.get('/guest-summary').json()['events']) == 4
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd api && PYTHONPATH=. .venv/bin/pytest tests/test_guests.py -q`

Expected: FAIL because the guest update route does not exist and Vidai remains in the seeded event list.

- [ ] **Step 3: Implement minimal migration and update route**

```python
vidai = s.scalar(select(Event).where(Event.slug == 'vidai'))
wedding = s.scalar(select(Event).where(Event.slug == 'wedding'))
if vidai and wedding:
    s.execute(update(InvitationEvent).where(InvitationEvent.event_id == vidai.id).values(event_id=wedding.id))
    s.delete(vidai)
    s.commit()
```

Replace one guest’s current invitation mappings in the update route, then create mappings for the submitted event ids.

- [ ] **Step 4: Run API tests and verify they pass**

Run: `cd api && PYTHONPATH=. .venv/bin/pytest -q`

Expected: PASS.

### Task 2: Build mobile login and guest edit flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/api.ts`
- Modify: `src/guest-manager.css`
- Modify: `src/mobile-fix.css`
- Modify: `tests/App.test.tsx`

**Interfaces:**
- Consumes `api.updateGuest(id, name, side, allEvents, eventIds)`.
- Produces edit actions in the guest list and a dedicated `organiser-login` layout.

- [ ] **Step 1: Write failing UI tests**

```tsx
expect(screen.getByRole('main')).toHaveClass('organiser-login')
expect(screen.queryByText(/Vidai/i)).not.toBeInTheDocument()
```

- [ ] **Step 2: Run UI tests and verify they fail**

Run: `npm test -- --run tests/App.test.tsx`

Expected: FAIL because login is still rendered as `invite` and the event constant includes Vidai.

- [ ] **Step 3: Implement scoped login and edit mode**

```tsx
const [editingGuest, setEditingGuest] = useState<ApiGuest | null>(null);
const save = async () => editingGuest
  ? api.updateGuest(editingGuest.id, name.trim(), side, allEvents, selected)
  : api.inviteGuest((await api.addGuest(name.trim(), side)).id, allEvents, selected);
```

Use dedicated `.organiser-login` styles for a mobile-first card and remove all Vidai event-card data.

- [ ] **Step 4: Run UI tests and production build**

Run: `npm test && npm run build`

Expected: PASS.

### Task 3: Deploy and verify

**Files:**
- No source files beyond Tasks 1–2.

- [ ] **Step 1: Commit and push main**

```bash
git add api src tests docs/superpowers/plans/2026-07-19-wedding-guest-edit-and-mobile-login.md
git commit -m "feat: edit guests and refine mobile login"
git push origin main
```

- [ ] **Step 2: Deploy the API migration**

Copy `api/app/main.py` to `/home/rsumit123/wedding-planner-api/api/app/main.py`, then run `docker compose up -d --build --force-recreate` there.

- [ ] **Step 3: Verify production**

Log in, create a temporary guest, edit their side and selected event, assert four event totals, then remove only the temporary test rows. Confirm frontend contains the mobile-login UI asset and `GET /guest-summary` returns four functions.
