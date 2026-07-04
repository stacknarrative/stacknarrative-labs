import type { APIRoute } from 'astro';
import { normalizeDomain, toWebsiteUrl } from '../../lib/domain';
import { findCompanyByDomain, createDraftCompany, getCompanyDossier, touchLastScanned } from '../../lib/db';
import { scrapePage } from '../../lib/scraper';
import { extractCompanyData } from '../../lib/extract';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.url || typeof body.url !== 'string') {
    return Response.json({ error: 'A "url" field is required' }, { status: 400 });
  }

  let domain: string;
  let websiteUrl: string;
  try {
    domain = normalizeDomain(body.url);
    websiteUrl = toWebsiteUrl(body.url);
  } catch {
    return Response.json({ error: 'That does not look like a valid URL' }, { status: 400 });
  }

  // Dedup gate: never re-scrape a company we already have.
  const existing = await findCompanyByDomain(DB, domain);
  if (existing) {
    const dossier = await getCompanyDossier(DB, existing.id);
    return Response.json({ duplicate: true, company: dossier }, { status: 200 });
  }

  let scraped;
  try {
    scraped = await scrapePage(websiteUrl);
  } catch (err) {
    return Response.json(
      { error: `Could not fetch that site: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  let extracted;
  try {
    extracted = await extractCompanyData(ANTHROPIC_API_KEY, scraped);
  } catch (err) {
    return Response.json(
      { error: `AI extraction failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  const companyId = await createDraftCompany(DB, { domain, websiteUrl, extracted, sourceUrl: scraped.url });
  await touchLastScanned(DB, companyId);

  const dossier = await getCompanyDossier(DB, companyId);
  return Response.json({ duplicate: false, company: dossier }, { status: 201 });
};
