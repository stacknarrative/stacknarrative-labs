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

  const header = COLUMNS.join(',');
  const rows = companies.map((c) => COLUMNS.map((col) => csvEscape((c as any)[col])).join(','));
  const csv = [header, ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="companies.csv"',
    },
  });
};
