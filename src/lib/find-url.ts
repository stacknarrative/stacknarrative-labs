// Domains that are directories/social, not a company's own site.
const SKIP_HOSTS =
  /(linkedin\.com|crunchbase\.com|wikipedia\.org|facebook\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|g2\.com|capterra\.com|glassdoor\.|indeed\.|bloomberg\.com|pitchbook\.com|apple\.com|play\.google\.com)/i;

/** Uses Serper to find a hospitality/travel-tech company's website from its name.
 *  The industry keywords disambiguate generic names (e.g. "Mews", "Lighthouse"). */
export async function findCompanyUrl(serperKey: string, name: string): Promise<string | null> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: `${name} hotel hospitality travel technology software company`, num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper search failed (${res.status})`);
  const data = (await res.json()) as { organic?: { link?: string }[] };

  for (const r of data.organic ?? []) {
    if (!r.link) continue;
    let host: string;
    try {
      host = new URL(r.link).hostname;
    } catch {
      continue;
    }
    if (SKIP_HOSTS.test(host)) continue;
    // First non-directory result — return its homepage.
    return `https://${host}`;
  }
  return null;
}
