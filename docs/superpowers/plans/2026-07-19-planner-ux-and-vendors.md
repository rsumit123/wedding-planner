# Planner UX and Vendors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate dead home-page actions, add a shared budget and vendor list, and make the public invite page stable on mobile.

**Architecture:** FastAPI stores vendor expenses in SQLite and exposes organiser-only vendor CRUD endpoints plus calculated totals. React renders a real Budget & vendors page and routes every home-page control to a real destination. The public invite page receives a mobile-specific layout where the portrait is a normal grid row instead of an absolutely positioned overlay.

**Tech Stack:** FastAPI, SQLAlchemy/SQLite, React, TypeScript, Vitest, pytest.

## Global Constraints

- Work directly on `main`; preserve existing task and guest data.
- Home-page actions must either navigate to a usable screen or be visually non-interactive.
- Vendor entries include name, category, total cost, and paid amount; totals show planned, paid, and due.
- Public invite must remain clear and non-overlapping at 390px width.

---

### Task 1: Add vendor data and totals API

**Files:**
- Modify: `api/app/main.py`
- Create: `api/tests/test_vendors.py`

**Interfaces:**
- Produces `GET /vendors`, `POST /vendors`, `PATCH /vendors/{vendor_id}`, and `GET /budget-summary`.
- `VendorIn` accepts `{name, category, amount, paid_amount}` with non-negative monetary values.

- [ ] **Step 1: Write failing vendor API test**

```python
vendor = client.post('/vendors', json={'name': 'Mehendi artists', 'category': 'Beauty', 'amount': 12000, 'paid_amount': 3000})
assert vendor.status_code == 200
summary = client.get('/budget-summary').json()
assert summary == {'planned_total': 12000, 'paid_total': 3000, 'due_total': 9000}
```

- [ ] **Step 2: Run it and verify it fails**

Run: `cd api && PYTHONPATH=. .venv/bin/pytest tests/test_vendors.py -q`

Expected: FAIL because `/vendors` and `/budget-summary` do not exist.

- [ ] **Step 3: Implement minimal model and routes**

```python
class Vendor(Base):
    __tablename__ = 'vendors'
    id = mapped_column(primary_key=True)
    name = mapped_column(String)
    category = mapped_column(String)
    amount = mapped_column(Integer, default=0)
    paid_amount = mapped_column(Integer, default=0)
```

Create, list, and update vendor records; calculate totals from all saved records.

- [ ] **Step 4: Run API suite**

Run: `cd api && PYTHONPATH=. .venv/bin/pytest -q`

Expected: PASS.

### Task 2: Wire navigation and budget page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/api.ts`
- Modify: `src/guest-manager.css`
- Modify: `tests/App.test.tsx`

**Interfaces:**
- Consumes `api.vendors()`, `api.addVendor()`, `api.updateVendor()`, and `api.budgetSummary()`.
- Produces `<BudgetManager />` and a `setPage` callback for dashboard quick actions.

- [ ] **Step 1: Write a failing UX test**

```tsx
await user.click(screen.getByRole('button', { name: /budget & vendors/i }));
expect(screen.getByRole('heading', { name: /budget, clearly held/i })).toBeVisible();
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test -- --run tests/App.test.tsx`

Expected: FAIL because the quick link has no click handler and the budget page is a placeholder.

- [ ] **Step 3: Implement navigation and vendor manager**

```tsx
<button onClick={() => setPage('Guests & RSVPs')}>…</button>
<button onClick={() => setPage('Budget & vendors')}>…</button>
```

Render summary cards and a simple add/edit vendor form on the real Budget & vendors page. Rename the navigation item `Guest page` to `Public invite`.

- [ ] **Step 4: Run frontend tests and build**

Run: `npm test && npm run build`

Expected: PASS.

### Task 3: Repair public invite mobile layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/guest-manager.css`
- Modify: `src/mobile-fix.css`

- [ ] **Step 1: Add a regression assertion**

```tsx
expect(screen.getByRole('button', { name: /venue details/i })).toBeDisabled()
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test -- --run tests/App.test.tsx`

Expected: FAIL because the venue-looking control is a live button.

- [ ] **Step 3: Implement the mobile layout**

Use `.public-invite` scoped styles. On small screens, stack heading, portrait, and details in document flow; set a fixed portrait height with `object-fit: cover`. Replace the venue button with a non-interactive status label.

- [ ] **Step 4: Verify at mobile width**

Open the app at 390×844, view the public invite page, and confirm the image does not overlap the headline or CTA area.

### Task 4: Deploy and verify

- [ ] **Step 1: Commit and push main**

```bash
git add api src tests docs/superpowers/plans/2026-07-19-planner-ux-and-vendors.md
git commit -m "feat: add vendor planning and improve navigation"
git push origin main
```

- [ ] **Step 2: Deploy API**

Copy `api/app/main.py` to `/home/rsumit123/wedding-planner-api/api/app/main.py` and force-recreate only `wedding-planner-api` with Docker Compose.

- [ ] **Step 3: Verify production**

Create and update a temporary vendor, assert totals, remove only that test vendor, then confirm the production frontend contains the budget manager and public invite layout.
