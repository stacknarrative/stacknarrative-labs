import type { APIRoute } from 'astro';
import { getCompanyDossier } from '../../../../lib/db';
import { extractFounderIntelligence } from '../../../../lib/founder';
import { saveFounderIntelligence, getFounderDossier, getFounderJob, setFounderJob } from '../../../../lib/founder-db';

export const prerender = false;

// GET: return the stored founder dossier + current job status (free, no AI).
export const GET: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  const [founder, job] = await Promise.all([getFounderDossier(DB, id), getFounderJob(DB, id)]);
  return Response.json({ founder, job });
};

// POST: start founder research in the background and return immediately.
// The actual web-search + AI work runs past the response via waitUntil, so it
// never blocks the HTTP request (which would 524 after ~100s).
export const POST: APIRoute = async ({ params, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;
  const ctx = locals.runtime.ctx;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const company = await getCompanyDossier(DB, id);
  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

  const existing = await getFounderJob(DB, id);
  if (existing?.status === 'running') {
    return Response.json({ job: existing }, { status: 202 });
  }

  await setFounderJob(DB, id, 'running');

  const work = (async () => {
    try {
      const result = await extractFounderIntelligence(ANTHROPIC_API_KEY, {
        name: company.name,
        websiteUrl: company.website_url,
        domain: company.domain,
        founderHint: company.founders?.[0]?.name ?? null,
      });
      await saveFounderIntelligence(DB, id, result.data, result.sources);
      await setFounderJob(DB, id, 'done');
    } catch (err) {
      await setFounderJob(DB, id, 'error', err instanceof Error ? err.message : 'unknown error');
    }
  })();

  ctx.waitUntil(work);

  return Response.json({ job: { status: 'running' } }, { status: 202 });
};
