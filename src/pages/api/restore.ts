import type { APIRoute } from 'astro';

export const prerender = false;

// Restores a backup produced by /api/backup.json into this database.
// POST the backup JSON as the request body. Existing rows in the affected tables are
// replaced. Use this once, on the NEW deployment, to re-import your data.
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

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;

  let dump: { tables?: Record<string, Record<string, unknown>[]> };
  try {
    dump = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!dump.tables) return Response.json({ error: 'Missing "tables" in backup' }, { status: 400 });

  const stmts: D1PreparedStatement[] = [];
  const summary: Record<string, number> = {};

  for (const table of TABLES) {
    const rows = dump.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    stmts.push(DB.prepare(`DELETE FROM ${table}`));
    for (const row of rows) {
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      stmts.push(
        DB.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).bind(...cols.map((c) => row[c] ?? null))
      );
    }
    summary[table] = rows.length;
  }

  if (stmts.length === 0) return Response.json({ error: 'Nothing to restore' }, { status: 400 });

  try {
    await DB.batch(stmts);
  } catch (err) {
    return Response.json({ error: `Restore failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }

  return Response.json({ restored: summary });
};
