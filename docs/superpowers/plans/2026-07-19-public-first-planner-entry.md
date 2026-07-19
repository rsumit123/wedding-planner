# Public-First Planner Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the site on the public invitation and move organiser access behind a visible planner-login action.

**Architecture:** Add an entry-view state to `App`; keep existing planner screens and API authentication unchanged. Pass explicit navigation callbacks into `InvitePage` so it can enter login or return to the public view.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

## Global Constraints

- Preserve the existing public invitation styling and mobile layout.
- Do not expose organiser-only planner data before login.
- Keep the existing organiser login API and session behavior unchanged.

---

### Task 1: Cover public-first entry behavior

**Files:** Modify `tests/App.test.tsx`.

**Interfaces:** Consumes the default `App` render. Produces regression coverage for the invitation default and `Planner login` action.

- [ ] Write a failing test that renders `App`, asserts `With the blessings of our families`, clicks the button named `Planner login`, and asserts the button named `Sign in to planner` appears.
- [ ] Run `npm test -- --run tests/App.test.tsx`; it must fail because the public-header action does not yet exist.

### Task 2: Add invitation-to-planner navigation

**Files:** Modify `src/App.tsx`; test in `tests/App.test.tsx`.

**Interfaces:** `InvitePage` consumes `onPlannerLogin` and `onBack` callbacks. `App` produces an entry state of `public`, `login`, or `planner`.

- [ ] Add entry state initialized to `public`; do not let the existing session lookup change it automatically.
- [ ] Render the public invitation for `public`, the existing sign-in screen for `login`, and the existing planner layout for `planner`.
- [ ] Make a successful existing login set entry state to `planner` after loading data.
- [ ] Add a `Planner login` header button to the public invitation and a `← Invitation` action for returning to the public view from the planner.
- [ ] Run `npm test -- --run tests/App.test.tsx`, then `npm test -- --run && npm run build`; all must pass.
- [ ] Commit the source, tests, spec, and plan with `feat: open wedding site on public invitation`, then push `main` for the Vercel deployment.
