import type { APIRoute } from 'astro';
import { verifyCompany, getCompanyDossier } from '../../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  let body: { fields?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  await verifyCompany(DB, { companyId: id, fields: body.fields ?? {} });

  const dossier = await getCompanyDossier(DB, id);
  return Response.json({ company: dossier });
};
