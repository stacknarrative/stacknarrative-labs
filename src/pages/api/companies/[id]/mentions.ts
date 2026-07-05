import type { APIRoute } from 'astro';
import { getCompanyDossier } from '../../../../lib/db';
import { extractMentions } from '../../../../lib/mentions';
import { getMentions, saveMentions } from '../../../../lib/mentions-db';

export const prerender = false;

// GET: stored links (free, no AI).
export const GET: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  const mentions = await getMentions(DB, id);
  return Response.json({ mentions });
};

// POST: run the mentions scan synchronously and return the links.
// It's fast enough (a few searches) to complete inside the request window.
export const POST: APIRoute = async ({ params, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const company = await getCompanyDossier(DB, id);
  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

  let mentions;
  try {
    mentions = await extractMentions(ANTHROPIC_API_KEY, {
      name: company.name,
      websiteUrl: company.website_url,
      domain: company.domain,
      founderHint: company.founders?.[0]?.name ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: `Mentions scan failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  await saveMentions(DB, id, mentions);
  return Response.json({ mentions }, { status: 201 });
};
