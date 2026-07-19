# Public-First Planner Entry Design

## Goal

Make `wedding.skdev.one` open on the public invitation, while keeping organiser planning behind an explicit login action.

## Experience

The public invitation is the landing experience for every new visitor. Its header shows a compact `Planner login` action beside the couple name. Selecting it opens the existing organiser sign-in screen. A successful sign-in opens the private planner at Today. The public invitation header then offers `← Invitation` so an organiser can return without signing out.

## Architecture

`App` owns a small entry-view state (`public`, `login`, or the existing private planner). The existing API session check still runs on load but must not redirect a visitor away from the public invitation. `InvitePage` receives explicit callbacks for planner login and returning to the invitation; no API or data-model changes are required.

## Error Handling and Accessibility

The existing login form continues to display failed-login feedback. The header action remains a semantic button with visible text, works with keyboard navigation, and retains the current responsive invitation layout.

## Tests

The frontend test suite must verify that a fresh visit renders the public invitation and that selecting `Planner login` reveals the existing login form. Existing authenticated-planner shortcut tests must continue to pass.
