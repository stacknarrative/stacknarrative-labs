import type { APIRoute } from 'astro';
import { updateCompanyFields, getCompanyDossier, type EditableFields } from '../../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  let body: EditableFields;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  await updateCompanyFields(DB, id, body);
  const company = await getCompanyDossier(DB, id);
  return Response.json({ company });
};
