import type { APIRoute } from 'astro';
import { normalizeDomain, toWebsiteUrl } from '../../lib/domain';
import { findCompanyByDomain, createDraftCompany, touchLastScanned, markCompanyVerified } from '../../lib/db';
import { findCompanyUrl } from '../../lib/find-url';
import { scrapePage } from '../../lib/scraper';
import { extractCompanyData } from '../../lib/extract';

export const prerender = false;

// POST { name } — find the company's URL, then scrape + extract + save one company.
// Called once per name by the client bulk loop, so each request stays short.
export const POST: APIRoute = async ({ request, locals }) => {
  const { DB, ANTHROPIC_API_KEY, SERPER_API_KEY } = locals.runtime.env;
  if (!SERPER_API_KEY) return Response.json({ status: 'error', error: 'SERPER_API_KEY is not set' }, { status: 500 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'error', error: 'Invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return Response.json({ status: 'error', error: 'Missing name' }, { status: 400 });

  try {
    const url = await findCompanyUrl(SERPER_API_KEY, name);
    if (!url) return Response.json({ status: 'no_url', name });

    const domain = normalizeDomain(url);
    const websiteUrl = toWebsiteUrl(url);

    const existing = await findCompanyByDomain(DB, domain);
    if (existing) return Response.json({ status: 'duplicate', name, companyId: existing.id, url });

    const scraped = await scrapePage(websiteUrl);
    const extracted = await extractCompanyData(ANTHROPIC_API_KEY, scraped);
    const companyId = await createDraftCompany(DB, { domain, websiteUrl, extracted, sourceUrl: scraped.url });
    await touchLastScanned(DB, companyId);
    await markCompanyVerified(DB, companyId);

    return Response.json({ status: 'scanned', name, companyId, url, companyName: extracted.name ?? name });
  } catch (err) {
    return Response.json({ status: 'error', name, error: err instanceof Error ? err.message : 'unknown error' });
  }
};
