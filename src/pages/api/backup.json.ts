import type { APIRoute } from 'astro';

export const prerender = false;

// Full database dump. Public endpoint so the entire dataset can be downloaded from a
// browser without any Cloudflare login — the running Worker reads the D1 binding directly.
// Visit /api/backup.json to download every row of every table as one JSON file.
const TABLES = [
  'companies',
  'founders',
  'products',
  'product_features',
  'competitors',
  'pricing_tiers',
  'review_themes',
  'positioning_notes',
  'field_sources',
  'company_mentions',
];

export const GET: APIRoute = async ({ locals }) => {
  const { DB } = locals.runtime.env;
  const dump: Record<string, unknown> = { exported_at: new Date().toISOString(), tables: {} };
  const tables = dump.tables as Record<string, unknown[]>;

  for (const t of TABLES) {
    try {
      const rows = await DB.prepare(`SELECT * FROM ${t}`).all();
      tables[t] = rows.results ?? [];
    } catch {
      tables[t] = []; // table may not exist in this deployment; skip it
    }
  }

  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="company-data-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
};
