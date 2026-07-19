# Sumit & Puja Wedding Planner — Design

## Purpose

Create a shared, mobile-first workspace that keeps Sumit, Puja, and their family organised for the wedding celebrations. A separate guest-facing page shares only approved information.

## Known celebration schedule

| Date | Celebration | Notes |
| --- | --- | --- |
| 28 November 2026 | Lagan & Tilak | |
| 30 November 2026 | Haldi & Matkor | |
| 1 December 2026 | Wedding ceremony | After 1:06 |
| 2 December 2026 | Vidai | After 8 AM |
| 3 December 2026 | Reception party | Venue and time to be added |

## Users and access

- Any invited organiser can update shared planning data.
- All organiser changes have an activity entry showing the editor and time of change.
- Guests use a separate public page. Private planning data is never exposed there.
- Public content is explicitly published from the planner.

## First-release product structure

### Private planner

1. **Today** — wedding countdown, next celebration, overdue tasks, and recent activity.
2. **Tasks** — tasks with owner, deadline, status, and ceremony association.
3. **Events** — the five celebrations, their dates/times, locations, notes, and event-specific work.
4. **Guests & RSVPs** — households, contact details, RSVP status, and optional notes for meals or travel.
5. **Budget & vendors** — planned versus paid amounts, payment due dates, vendor contacts, and booking status.
6. **Guest page editor** — controls the guest-facing schedule, venue details, RSVP link, FAQ, and WhatsApp contact.

### Guest page

The public page contains the couple names, a countdown, published ceremony schedule, venue/map links, RSVP action, practical notes, and a WhatsApp help contact. It intentionally excludes budgets, guest lists, private tasks, and vendor information.

## Visual design

- **Character:** festive Indian wedding organiser, disciplined enough for day-to-day planning.
- **Palette:** Sindoor Red `#AE2722`, Marigold `#F6BF47`, Midnight Blue `#1F3B4B`, Ivory `#FFFAF0`, Sand `#F3EEE4`.
- **Typography:** Georgia-style display serif for names and celebration headings; clean sans-serif for data, controls, and long-form information.
- **Signature detail:** understated concentric rangoli-inspired linework in the red hero area.
- **Information hierarchy:** the event sequence is structural; it appears as a chronological list, not arbitrary decoration.

## Responsive behavior

- Desktop: a persistent planner sidebar and spacious two-column dashboard sections.
- Tablet: sidebar remains available with compressed content cards.
- Mobile: navigation becomes a horizontally scrollable tab bar; controls have touch-sized targets; forms use single-column layouts.
- The guest page is mobile-first and does not require account access.

## Data and publishing flow

1. Organisers create or update private tasks, events, guests, costs, vendors, and guest-page settings.
2. Each update writes an activity record.
3. The guest page reads only the published event and guest-information fields.
4. A change to private planning data never changes public content unless the organiser publishes the relevant field.

## Error and empty states

- New sections show a clear action, such as “Add your first vendor” or “Create a task.”
- Form validation identifies the missing field and keeps entered data intact.
- When publishing fails, the planner explains that the guest page was not updated and offers a retry.
- A guest page with no published details shows a simple “Details will be shared soon” message rather than private placeholders.

## Quality checks

- Verify the core dashboard and guest page at desktop, tablet, and mobile widths.
- Verify all shared organisers can make edits and activity records are added.
- Verify private data cannot appear on the public guest page.
- Verify keyboard focus, form labels, and reduced-motion behavior.

## Scope boundaries

The first release does not include room allocation, transport coordination, digital invitation delivery, payments, or a guest photo album. These can be added after the planner’s core workflow is in use.
