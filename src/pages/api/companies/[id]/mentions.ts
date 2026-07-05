import type { APIRoute } from 'astro';
import { getCompanyDossier } from '../../../../lib/db';
import { extractMentions } from '../../../../lib/mentions';
import { getMentions, saveMentions, getMentionJob, setMentionJob } from '../../../../lib/mentions-db';

export const prerender = false;

// GET: stored links + job status (free, no AI).
export const GET: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  const [mentions, job] = await Promise.all([getMentions(DB, id), getMentionJob(DB, id)]);
  return Response.json({ mentions, job });
};

// POST: start the mentions scan in the background (returns immediately; avoids 524).
export const POST: APIRoute = async ({ params, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;
  const ctx = locals.runtime.ctx;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const company = await getCompanyDossier(DB, id);
  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

  const existing = await getMentionJob(DB, id);
  if (existing?.status === 'running') return Response.json({ job: existing }, { status: 202 });

  await setMentionJob(DB, id, 'running');

  ctx.waitUntil(
    (async () => {
      try {
        const mentions = await extractMentions(ANTHROPIC_API_KEY, {
          name: company.name,
          websiteUrl: company.website_url,
          domain: company.domain,
          founderHint: company.founders?.[0]?.name ?? null,
        });
        await saveMentions(DB, id, mentions);
        await setMentionJob(DB, id, 'done');
      } catch (err) {
        await setMentionJob(DB, id, 'error', err instanceof Error ? err.message : 'unknown error');
      }
    })()
  );

  return Response.json({ job: { status: 'running' } }, { status: 202 });
};
