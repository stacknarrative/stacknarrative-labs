import type { APIRoute } from 'astro';
import { getCompanyDossier } from '../../../../lib/db';
import { extractFounderIntelligence } from '../../../../lib/founder';
import { saveFounderIntelligence, getFounderDossier } from '../../../../lib/founder-db';

export const prerender = false;

// GET: return the stored founder dossier (free, no AI).
export const GET: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  const dossier = await getFounderDossier(DB, id);
  return Response.json({ founder: dossier });
};

// POST: run founder intelligence (web search + AI), save, return it.
export const POST: APIRoute = async ({ params, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const company = await getCompanyDossier(DB, id);
  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

  let result;
  try {
    result = await extractFounderIntelligence(ANTHROPIC_API_KEY, {
      name: company.name,
      websiteUrl: company.website_url,
      domain: company.domain,
      founderHint: company.founders?.[0]?.name ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: `Founder intelligence failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  await saveFounderIntelligence(DB, id, result.data, result.sources);
  const dossier = await getFounderDossier(DB, id);
  return Response.json({ founder: dossier }, { status: 201 });
};
