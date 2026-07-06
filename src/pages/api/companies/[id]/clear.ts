import type { APIRoute } from 'astro';
import { clearCompanyFields, getCompanyDossier } from '../../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  let body: { fields?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!Array.isArray(body.fields) || body.fields.length === 0) {
    return Response.json({ error: 'No fields selected' }, { status: 400 });
  }

  await clearCompanyFields(DB, id, body.fields);
  const company = await getCompanyDossier(DB, id);
  return Response.json({ company });
};
