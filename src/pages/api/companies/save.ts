import type { APIRoute } from 'astro';
import { findCompanyByDomain, createDraftCompany, verifyCompany, touchLastScanned, getCompanyDossier } from '../../../lib/db';
import type { ExtractedCompanyData } from '../../../types/company';

export const prerender = false;

interface SaveBody {
  domain?: string;
  websiteUrl?: string;
  sourceUrl?: string;
  extracted?: ExtractedCompanyData;
  fields?: Record<string, string>;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.domain || !body.websiteUrl || !body.sourceUrl || !body.extracted) {
    return Response.json({ error: 'Missing domain, websiteUrl, sourceUrl, or extracted data' }, { status: 400 });
  }

  // Re-check for a race: someone else may have saved this domain since the preview was shown.
  const existing = await findCompanyByDomain(DB, body.domain);
  if (existing) {
    const dossier = await getCompanyDossier(DB, existing.id);
    return Response.json({ duplicate: true, company: dossier }, { status: 200 });
  }

  const merged: ExtractedCompanyData = { ...body.extracted, ...body.fields };

  const companyId = await createDraftCompany(DB, {
    domain: body.domain,
    websiteUrl: body.websiteUrl,
    extracted: merged,
    sourceUrl: body.sourceUrl,
  });
  await touchLastScanned(DB, companyId);
  await verifyCompany(DB, { companyId, fields: body.fields ?? {} });

  const dossier = await getCompanyDossier(DB, companyId);
  return Response.json({ duplicate: false, company: dossier }, { status: 201 });
};
