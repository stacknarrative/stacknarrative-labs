import type { APIRoute } from 'astro';
import { getCompanyDossier, refreshCompany } from '../../../../lib/db';
import { scrapePage } from '../../../../lib/scraper';
import { extractCompanyData } from '../../../../lib/extract';

export const prerender = false;

// POST: re-fetch the company's website and re-extract, overwriting scraped fields.
// Manual data (reviews, mentions) is preserved.
export const POST: APIRoute = async ({ params, locals }) => {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const company = await getCompanyDossier(DB, id);
  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

  try {
    const scraped = await scrapePage(company.website_url);
    const extracted = await extractCompanyData(ANTHROPIC_API_KEY, scraped);
    await refreshCompany(DB, id, extracted, scraped.url);
  } catch (err) {
    return Response.json(
      { error: `Re-scan failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    );
  }

  const updated = await getCompanyDossier(DB, id);
  return Response.json({ company: updated });
};
