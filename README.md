# Stack Narrative Labs

Research operating system for company intelligence, positioning, and GTM
research. Paste a company URL, get an AI-drafted dossier, verify it, and it's
saved for good — duplicates are caught by domain before anything is
re-scraped.

Deployed independently from stacknarrative.com, at `labs.stacknarrative.com`.

## How it works

1. Enter a company URL on the home page.
2. The server normalizes the URL to a root domain and checks the database —
   if that domain has already been researched, the existing record is shown
   immediately instead of re-scraping.
3. If it's new, the homepage is fetched and reduced to visible text + nav
   links (`src/lib/scraper.ts`).
4. That text is sent to Claude with a structured schema
   (`src/lib/extract.ts`), returning company name, tagline, headline, ICP,
   founders, products (with sub-features), menu items, CTAs, integrations,
   competitors, and pricing tiers.
5. Everything is saved as a `draft` record. Nothing is treated as final until
   a human reviews the fields on-screen and clicks **Save as verified**
   (`src/components/VerifyPanel.tsx`) — this is deliberate: the AI drafts,
   people verify.
6. All researched companies show up in a list on the home page, each with a
   full dossier detail page, and the whole table exports to CSV from
   `/api/export.csv`.

## Data model

See `migrations/0001_init.sql`. One `companies` row per business, with
one-to-many child tables for `founders`, `products` → `product_features`,
`menu_items`, `ctas`, `integrations`, `competitors`, `pricing_tiers`, and
`review_themes`. `positioning_notes` is intentionally separate and is never
written by the AI extraction step — that's the strategist's own analysis.
`field_sources` records which page each field came from, for provenance.

## Local setup

```sh
npm install
```

1. **Create the D1 database** (one-time, requires a Cloudflare account
   logged into `wrangler`):

   ```sh
   npx wrangler d1 create labs_db
   ```

   Copy the `database_id` it prints into `wrangler.toml`.

2. **Run the migration:**

   ```sh
   npm run db:migrate:local     # for local dev
   npm run db:migrate:remote    # once, for the deployed database
   ```

3. **Set your Anthropic API key** as a secret (used by the extraction step):

   ```sh
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

   For local dev, create a `.dev.vars` file (already git-ignored):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Run the dev server:**

   ```sh
   npm run dev
   ```

## Deploying

```sh
npm run deploy
```

This builds the Astro site and deploys it to Cloudflare Pages via
`wrangler pages deploy`. Point the `labs.stacknarrative.com` custom domain at
the Cloudflare Pages project in the Cloudflare dashboard.

## Known limitations (MVP)

- Only the company's own website is scraped. G2/Capterra/LinkedIn/press are
  intentionally out of scope for v1 — see the product discussion for why
  (ToS risk on automated scraping of those sources) and the planned
  semi-manual capture flow for adding them later.
- No bulk Excel upload yet — single URL only. The pipeline (dedup → scrape →
  extract → verify) is the same either way, so bulk upload is a matter of
  looping this flow over spreadsheet rows.
- No re-scan/versioning yet. Re-researching an already-known domain shows the
  existing record rather than refreshing it.
- No auth — this is meant to sit behind Cloudflare Access or similar before
  any sensitive data goes in it.
