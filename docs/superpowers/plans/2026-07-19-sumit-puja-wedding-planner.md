# Sumit & Puja Wedding Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive shared wedding-planning app for Sumit and Puja, with a separately publishable guest page.

**Architecture:** A React single-page app provides the private planner and the public guest page under separate routes. Supabase Auth and Postgres store shared planning data and enforce the private/public boundary with row-level security; a small data-access layer isolates database calls from UI components.

**Tech Stack:** Vite, React, TypeScript, React Router, Supabase, Tailwind CSS, Lucide React, Vitest, React Testing Library, Playwright.

## Global Constraints

- Support desktop, tablet, and mobile layouts; mobile navigation must be horizontally scrollable and controls must be touch-sized.
- Use Sindoor Red `#AE2722`, Marigold `#F6BF47`, Midnight Blue `#1F3B4B`, Ivory `#FFFAF0`, and Sand `#F3EEE4`.
- Use a display serif only for celebration headings; use a legible sans-serif for controls and data.
- Use the supplied couple photo only as an edited transparent-background cutout; place it in the planner hero and guest-page hero.
- Create one distinctive icon treatment per event: Lagan & Tilak, Haldi & Matkor, Wedding, Vidai, and Reception.
- Never render private tasks, guest details, budget, vendor data, or activity data on `/invite`.

---

## Planned file structure

```text
src/
  app/App.tsx                         # Route and authentication boundary
  components/EventIcon.tsx             # Ceremony-specific illustrated SVG icons
  components/PhotoCutout.tsx           # Accessible couple cutout component
  components/ui/                       # Button, card, status, and empty-state primitives
  features/dashboard/DashboardPage.tsx # Planner summary
  features/events/EventsPage.tsx       # Event schedule/editor
  features/tasks/TasksPage.tsx         # Assignable task list/editor
  features/guests/GuestsPage.tsx       # Household and RSVP editor
  features/budget/BudgetPage.tsx       # Vendor and payment editor
  features/publish/GuestPageEditor.tsx # Publish controls
  features/public/InvitePage.tsx       # Guest-facing route
  lib/supabase.ts                      # Supabase client
  lib/wedding.ts                       # Typed queries and mutations
  types/wedding.ts                     # Shared app types
  data/default-events.ts               # Canonical celebration seed data
  assets/sumit-puja-cutout.png         # Edited transparent-background photo asset
supabase/migrations/0001_wedding.sql   # Tables, RLS, triggers, seed data
tests/                                 # Unit/component tests
e2e/                                   # Browser viewport and public-boundary tests
```

### Task 1: Bootstrap the repository and design system

**Files:**
- Create: `package.json`, `vite.config.ts`, `src/main.tsx`, `src/index.css`, `src/app/App.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/EmptyState.tsx`
- Create: `tests/setup.ts`, `tests/ui/Button.test.tsx`

**Interfaces:**
- Produces `Button({ children, variant, ...props })` where `variant` is `'primary' | 'secondary' | 'quiet'`.
- Produces `Card({ children, className })` for shared section containers.

- [ ] **Step 1: Initialise the Vite TypeScript project and install dependencies.**

```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom @supabase/supabase-js lucide-react
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright
```

- [ ] **Step 2: Write the failing button test.**

```tsx
// tests/ui/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/ui/Button';

it('uses the primary wedding colour for the primary action', () => {
  render(<Button>Save task</Button>);
  expect(screen.getByRole('button', { name: 'Save task' })).toHaveClass('bg-sindoor');
});
```

- [ ] **Step 3: Run the test and confirm it fails because `Button` does not exist.**

```bash
npx vitest run tests/ui/Button.test.tsx
```

- [ ] **Step 4: Add the theme and minimal components.**

```tsx
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { variant?: 'primary' | 'secondary' | 'quiet' };
export function Button({ children, variant = 'primary', className = '', ...props }: Props) {
  const styles = { primary: 'bg-sindoor text-ivory', secondary: 'bg-marigold text-ink', quiet: 'bg-transparent text-sindoor' };
  return <button className={`min-h-11 rounded-xl px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${styles[variant]} ${className}`} {...props}>{children}</button>;
}
```

```css
/* src/index.css */
:root { --sindoor:#AE2722; --marigold:#F6BF47; --ink:#1F3B4B; --ivory:#FFFAF0; --sand:#F3EEE4; }
.bg-sindoor{background:var(--sindoor)} .bg-marigold{background:var(--marigold)} .text-ivory{color:var(--ivory)} .text-ink{color:var(--ink)} .text-sindoor{color:var(--sindoor)}
```

- [ ] **Step 5: Run the test and production build.**

```bash
npx vitest run tests/ui/Button.test.tsx && npm run build
```

- [ ] **Step 6: Commit the bootstrap.**

```bash
git add package.json package-lock.json src tests vite.config.ts
git commit -m "feat: bootstrap wedding planner UI"
```

### Task 2: Model, secure, and seed the shared wedding workspace

**Files:**
- Create: `supabase/migrations/0001_wedding.sql`, `src/types/wedding.ts`, `src/data/default-events.ts`, `src/lib/supabase.ts`, `src/lib/wedding.ts`
- Test: `tests/data/default-events.test.ts`

**Interfaces:**
- Produces `WeddingEvent`, `Task`, `GuestHousehold`, `Vendor`, `Activity`, and `PublicWeddingDetails` types.
- Produces `getEvents(): Promise<WeddingEvent[]>` and `publishGuestDetails(input: PublicWeddingDetails): Promise<void>`.

- [ ] **Step 1: Write the canonical schedule test.**

```ts
import { DEFAULT_EVENTS } from '../../src/data/default-events';
it('contains the five confirmed celebrations in chronological order', () => {
  expect(DEFAULT_EVENTS.map(({ name }) => name)).toEqual(['Lagan & Tilak', 'Haldi & Matkor', 'Wedding ceremony', 'Vidai', 'Reception party']);
  expect(DEFAULT_EVENTS.at(-1)?.date).toBe('2026-12-03');
});
```

- [ ] **Step 2: Run it and confirm failure.**

```bash
npx vitest run tests/data/default-events.test.ts
```

- [ ] **Step 3: Implement the seed data and Supabase schema.**

```ts
// src/data/default-events.ts
export const DEFAULT_EVENTS = [
  { name: 'Lagan & Tilak', date: '2026-11-28', timeNote: '', icon: 'tilak' },
  { name: 'Haldi & Matkor', date: '2026-11-30', timeNote: '', icon: 'haldi' },
  { name: 'Wedding ceremony', date: '2026-12-01', timeNote: 'After 1:06', icon: 'wedding' },
  { name: 'Vidai', date: '2026-12-02', timeNote: 'After 8 AM', icon: 'vidai' },
  { name: 'Reception party', date: '2026-12-03', timeNote: '', icon: 'reception' },
] as const;
```

```sql
-- supabase/migrations/0001_wedding.sql
create table public.events (id uuid primary key default gen_random_uuid(), name text not null, event_date date not null, time_note text not null default '', icon_key text not null, venue text not null default '', is_published boolean not null default false);
create table public.tasks (id uuid primary key default gen_random_uuid(), title text not null, event_id uuid references public.events(id), assignee_id uuid, due_date date, status text not null default 'open' check (status in ('open','done')));
create table public.activity (id bigint generated always as identity primary key, actor_id uuid not null, action text not null, created_at timestamptz not null default now());
alter table public.events enable row level security; alter table public.tasks enable row level security; alter table public.activity enable row level security;
create policy "organisers read events" on public.events for select to authenticated using (true);
create policy "organisers edit events" on public.events for all to authenticated using (true) with check (true);
create policy "public reads published events" on public.events for select to anon using (is_published);
```

- [ ] **Step 4: Run tests and apply the migration to the linked Supabase project.**

```bash
npx vitest run tests/data/default-events.test.ts
supabase db push
```

- [ ] **Step 5: Commit the data layer.**

```bash
git add supabase src/types src/data src/lib tests/data
git commit -m "feat: add shared wedding data model"
```

### Task 3: Build the personalised visual assets and ceremony icon system

**Files:**
- Create: `src/components/EventIcon.tsx`, `src/components/PhotoCutout.tsx`, `src/assets/sumit-puja-cutout.png`
- Test: `tests/components/EventIcon.test.tsx`, `tests/components/PhotoCutout.test.tsx`

**Interfaces:**
- Produces `EventIcon({ kind, label, size })`, where `kind` is `'tilak' | 'haldi' | 'wedding' | 'vidai' | 'reception'`.
- Produces `PhotoCutout({ className, alt })` with a non-empty default alt text.

- [ ] **Step 1: Produce a transparent-background couple cutout from the supplied photo.**

Use image editing with this exact instruction: `Create a clean, natural, transparent-background cutout of the couple only. Preserve their faces, clothing, pose, and the woman's pink outfit and the man's black outfit. Remove the restaurant background and other people. Add a very subtle warm edge light only; do not change their appearance.` Save the resulting PNG as `src/assets/sumit-puja-cutout.png`.

- [ ] **Step 2: Write failing icon and image tests.**

```tsx
import { render, screen } from '@testing-library/react';
import { EventIcon } from '../../src/components/EventIcon';
it('labels the haldi icon for assistive technology', () => { render(<EventIcon kind="haldi" label="Haldi and Matkor" />); expect(screen.getByLabelText('Haldi and Matkor')).toBeVisible(); });
```

- [ ] **Step 3: Implement five recognisable SVG motifs.**

```tsx
// src/components/EventIcon.tsx
export function EventIcon({ kind, label }: { kind: 'tilak'|'haldi'|'wedding'|'vidai'|'reception'; label: string }) {
  const paths = { tilak: <><path d="M12 4v10"/><circle cx="12" cy="17" r="3"/></>, haldi: <><path d="M5 17h14l-2-7H7z"/><path d="M9 8c0-2 2-3 3-5 1 2 3 3 3 5"/></>, wedding: <><path d="M6 8h12l-2 11H8z"/><path d="M9 8V5h6v3"/></>, vidai: <><path d="M4 16h16"/><path d="M7 16V9h10v7"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="18" r="1"/></>, reception: <><path d="M12 3v18"/><path d="M7 7h10M6 12h12"/></> };
  return <svg aria-label={label} role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{paths[kind]}</svg>;
}
```

- [ ] **Step 4: Run component tests.**

```bash
npx vitest run tests/components/EventIcon.test.tsx tests/components/PhotoCutout.test.tsx
```

- [ ] **Step 5: Commit the visual asset system.**

```bash
git add src/components src/assets tests/components
git commit -m "feat: add ceremony icons and couple cutout"
```

### Task 4: Build the private planner shell, dashboard, events, and tasks

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`, `src/features/events/EventsPage.tsx`, `src/features/tasks/TasksPage.tsx`, `src/components/PlannerShell.tsx`
- Test: `tests/features/dashboard/DashboardPage.test.tsx`, `tests/features/events/EventsPage.test.tsx`, `tests/features/tasks/TasksPage.test.tsx`

**Interfaces:**
- Consumes `getEvents()` and `EventIcon`.
- Produces `/planner`, `/planner/events`, and `/planner/tasks` routes.

- [ ] **Step 1: Write dashboard tests for countdown, reception, and empty task state.**

```tsx
expect(screen.getByText(/days to the wedding/i)).toBeVisible();
expect(screen.getByText('Reception party')).toBeVisible();
expect(screen.getByRole('button', { name: /create a task/i })).toBeVisible();
```

- [ ] **Step 2: Run the dashboard test and confirm failure.**

```bash
npx vitest run tests/features/dashboard/DashboardPage.test.tsx
```

- [ ] **Step 3: Implement the planner routes.**

```tsx
// src/app/App.tsx
<Routes><Route path="/planner/*" element={<PlannerShell />}><Route index element={<DashboardPage />} /><Route path="events" element={<EventsPage />} /><Route path="tasks" element={<TasksPage />} /></Route><Route path="/invite" element={<InvitePage />} /></Routes>
```

The desktop shell uses a 240px left navigation. At widths below 768px it changes to a single-line, horizontally scrollable navigation bar. The dashboard hero shows `Sumit & Puja`, the cutout image, the countdown, and the nearest event. Each event card renders its exact `EventIcon`.

- [ ] **Step 4: Run all planner tests and build.**

```bash
npx vitest run tests/features && npm run build
```

- [ ] **Step 5: Commit the planner core.**

```bash
git add src/app src/features src/components tests/features
git commit -m "feat: build shared planner dashboard"
```

### Task 5: Add guests, vendors, budget, publishing controls, and activity records

**Files:**
- Create: `src/features/guests/GuestsPage.tsx`, `src/features/budget/BudgetPage.tsx`, `src/features/publish/GuestPageEditor.tsx`
- Modify: `src/lib/wedding.ts`, `src/app/App.tsx`
- Test: `tests/features/guests/GuestsPage.test.tsx`, `tests/features/publish/GuestPageEditor.test.tsx`

**Interfaces:**
- Produces `createGuestHousehold(input)`, `saveVendor(input)`, and `publishGuestDetails(input)` data functions.
- Produces `/planner/guests`, `/planner/budget`, and `/planner/guest-page` routes.

- [ ] **Step 1: Write tests that save a household and mark one event public.**

```tsx
await user.type(screen.getByLabelText('Family name'), 'Kumar family');
await user.click(screen.getByRole('button', { name: 'Save guest household' }));
expect(saveGuestHousehold).toHaveBeenCalledWith(expect.objectContaining({ familyName: 'Kumar family' }));
```

- [ ] **Step 2: Run the tests and confirm failure.**

```bash
npx vitest run tests/features/guests/GuestsPage.test.tsx tests/features/publish/GuestPageEditor.test.tsx
```

- [ ] **Step 3: Implement labelled single-column mobile forms and activity logging.**

Every mutating function in `src/lib/wedding.ts` must call `recordActivity({ action, actorId })` after the successful database mutation. Publishing uses the `is_published` flag on each event; budget, tasks, households, vendors, and activity endpoints are never used by the public route.

- [ ] **Step 4: Run the feature test suite.**

```bash
npx vitest run tests/features
```

- [ ] **Step 5: Commit shared management features.**

```bash
git add src/features src/lib src/app tests/features
git commit -m "feat: add guest budget and publishing tools"
```

### Task 6: Build and protect the guest-facing invitation page

**Files:**
- Create: `src/features/public/InvitePage.tsx`, `e2e/invite.spec.ts`
- Test: `tests/features/public/InvitePage.test.tsx`

**Interfaces:**
- Consumes only `getPublishedGuestDetails(): Promise<PublicWeddingDetails>`.
- Produces the unauthenticated `/invite` route.

- [ ] **Step 1: Write the public page boundary test.**

```tsx
render(<InvitePage details={{ coupleNames: 'Sumit & Puja', events: [{ name: 'Reception party', date: '2026-12-03' }], whatsappUrl: 'https://wa.me/910000000000' }} />);
expect(screen.getByText('Reception party')).toBeVisible();
expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
expect(screen.queryByText(/vendor/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and confirm failure.**

```bash
npx vitest run tests/features/public/InvitePage.test.tsx
```

- [ ] **Step 3: Implement the mobile-first invite page.**

The page hero displays `Sumit & Puja`, the couple cutout, and rangoli linework. The body renders only published events with their icons, map and RSVP actions only when configured, plus a WhatsApp help button. If no details are published, render `Details will be shared soon.`

- [ ] **Step 4: Test three viewports and the public data boundary.**

```ts
// e2e/invite.spec.ts
for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`invite is usable at ${viewport.width}px`, async ({ page }) => { await page.setViewportSize(viewport); await page.goto('/invite'); await expect(page.getByRole('heading', { name: /sumit.*puja/i })).toBeVisible(); });
}
```

- [ ] **Step 5: Run all validation and commit.**

```bash
npx vitest run && npx playwright test && npm run build
git add src/features/public tests/features/public e2e
git commit -m "feat: add guest invitation page"
```

### Task 7: Integrate the supplied repository and verify production readiness

**Files:**
- Modify: `.env.example`, `README.md`, `.gitignore`
- Test: `e2e/planner.spec.ts`, `e2e/invite.spec.ts`

**Interfaces:**
- Consumes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only from environment variables.

- [ ] **Step 1: Add safe environment documentation.**

```dotenv
# .env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 2: Add the repository remote once Sumit supplies its URL.**

```bash
git remote add origin <repository-url-provided-by-sumit>
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Run final checks.**

```bash
npm run build
npx vitest run
npx playwright test
git status --short
```

- [ ] **Step 4: Confirm the final site preserves the public/private separation.**

Open `/planner` while signed in and `/invite` in an incognito browser. Confirm the organiser dashboard contains tasks and budget, while the invitation page shows only published celebrations and guest information.
