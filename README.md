# Sumit & Puja Wedding Planner

A responsive wedding-planning home for Sumit, Puja, and their families.

## Run locally

```bash
npm install
npm run dev
```

## Check before publishing

```bash
npm test
npm run build
```

## Included in this first build

- Shared planner dashboard with tasks that can be added and completed in the browser.
- Five celebration cards: Lagan & Tilak, Haldi & Matkor, Wedding ceremony, Vidai, and Reception party.
- Individual, accessible ceremony icons.
- Personalised transparent cutout of Sumit and Puja in the main planner and guest-page preview.
- Desktop sidebar and mobile horizontal navigation.
- Separate guest-page preview that does not expose planner-side budget information.

## Next step for live family collaboration

This first UI build stores interactions in the open browser session. To let every invited family member update the same information across their own devices, connect a hosted data/auth service (the implementation plan recommends Supabase) and deploy the app.
