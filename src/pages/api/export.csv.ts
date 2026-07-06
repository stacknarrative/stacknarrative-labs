import type { APIRoute } from 'astro';
import { listCompanies } from '../../lib/db';

export const prerender = false;

const COLUMNS = [
  'name',
  'domain',
  'website_url',
  'tagline',
  'headline',
  'subheadline',
  'value_proposition',
  'category',
  'icp',
  'about_content',
  'product_likes',
  'product_dislikes',
  'mentions',
  'status',
  'last_scanned_at',
] as const;

function csvEscape(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET: APIRoute = async ({ locals }) => {
  const { DB } = locals.runtime.env;
  const companies = await listCompanies(DB);

  // Aggregate all mention/coverage links per company into one text blob.
  const mentionRows = await DB.prepare('SELECT company_id, category, url FROM company_mentions')
    .all<{ company_id: string; category: string | null; url: string }>();
  const mentionsByCompany = new Map<string, string[]>();
  for (const m of mentionRows.results ?? []) {
    const list = mentionsByCompany.get(m.company_id) ?? [];
    list.push(`[${m.category ?? 'other'}] ${m.url}`);
    mentionsByCompany.set(m.company_id, list);
  }

  const header = COLUMNS.join(',');
  const rows = companies.map((c) => {
    const mentions = (mentionsByCompany.get(c.id) ?? []).join(' | ');
    return COLUMNS.map((col) => csvEscape(col === 'mentions' ? mentions : (c as any)[col])).join(',');
  });
  const csv = [header, ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="companies.csv"',
    },
  });
};
