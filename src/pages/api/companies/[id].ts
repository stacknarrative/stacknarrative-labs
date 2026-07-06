import type { APIRoute } from 'astro';
import { getCompanyDossier, deleteCompany } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const dossier = await getCompanyDossier(DB, id);
  if (!dossier) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ company: dossier });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  await deleteCompany(DB, id);
  return Response.json({ deleted: true });
};
