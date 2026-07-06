# Company Data Tool

**v1.0 — 6 July 2026**

Research tool for hospitality/travel-technology companies. Scan a company's
website into a structured record, enrich it with manual reviews and media
links, edit or delete any field, and compare a set of competitors.

Runs at `labs.stacknarrative.com` on Cloudflare Workers + D1. Private/internal.

## What it does

**Company scan (single or bulk)**
- Enter a URL → scrapes the homepage + About/Our Story/Company pages → AI
  extracts name, tagline, headline, subheadline, value proposition, category,
  ICP, founders, products (with features), competitors, pricing, and an
  "About" dump. Preview first; save only when you confirm.
- Bulk add by **company name**: paste a list (or upload .txt/.csv). Each name
  is looked up (hospitality-tech-biased search), its website found, scanned,
  and saved as **verified** — one at a time with live progress.
- Duplicate protection: an already-scanned domain is never re-scraped.

**Per company**
- **Edit** any field and save.
- **Reviews**: paste "Likes of product" and "Dislikes of product", saved to the company.
- **Mentions**: on-demand Serper search that dumps press / funding / product /
  interview / podcast links (category-disambiguated; links only, ~1s).
- **Manage**: clear individual fields, **re-scan** the website for fresh data
  (reviews kept), or delete the company entirely.

**Main table**
- Filter by name, tick 5–7 companies to **Compare** (selection persists in the
  browser), **Export selected** to CSV, or **Re-scan selected** in bulk.
- Full-database **Export CSV** in the header.

## Architecture

- **Frontend/SSR**: Astro + React, Tailwind, deployed as a Cloudflare Worker.
- **Database**: Cloudflare D1 (SQLite). Schema in `migrations/`.
- **AI extraction**: Claude (Anthropic API) — `ANTHROPIC_API_KEY`.
- **Link/URL search**: Serper (Google) — `SERPER_API_KEY`.

## Required secrets (Cloudflare Worker → Settings → Variables and Secrets)

- `ANTHROPIC_API_KEY` — Claude API key (website extraction).
- `SERPER_API_KEY` — Serper.dev key (mentions + bulk URL lookup).
- `DB` binding → the `labs_db` D1 database.

## Migrations (run in the D1 Console, in order)

- `0001_init.sql` — core tables.
- `0002_about_content.sql` — About dump column.
- `0004_reviews.sql` — product likes/dislikes columns.
- `0005_mentions.sql` — company_mentions table.

(`GET /api/debug-env` reports which secrets are bound — names only, no values.)

## Local dev

```sh
npm install
npm run build
npx wrangler dev --local      # local D1 + assets
```

Set `ANTHROPIC_API_KEY` / `SERPER_API_KEY` in `.dev.vars` for local runs.
