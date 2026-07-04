import type { APIRoute } from 'astro';
import { listCompanies } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { DB } = locals.runtime.env;
  const companies = await listCompanies(DB);
  return Response.json({ companies });
};
