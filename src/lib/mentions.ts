import type { ExtractedMention, MentionCategory } from '../types/mentions';

function classify(url: string, title: string, fromNews: boolean): MentionCategory {
  const s = `${url} ${title}`.toLowerCase();
  if (/podcast|episode|spotify|apple\.com\/.*podcast|listen/.test(s)) return 'podcast';
  if (/interview|q&a|fireside|in conversation|sits down/.test(s)) return 'interview';
  if (/fund|raise|series [a-e]|seed|investment|valuation|venture/.test(s)) return 'funding';
  if (/launch|announc|releases?|unveil|introduc|new feature|product update/.test(s)) return 'product_news';
  if (/press|newsroom|prnewswire|businesswire|pr-?wire|press-release/.test(s)) return 'press_release';
  return fromNews ? 'press_release' : 'other';
}

interface SerperResult {
  title?: string;
  link?: string;
}

async function serper(apiKey: string, path: 'search' | 'news', q: string): Promise<SerperResult[]> {
  const res = await fetch(`https://google.serper.dev/${path}`, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper ${path} failed (${res.status})`);
  const data = (await res.json()) as { organic?: SerperResult[]; news?: (SerperResult & { link?: string })[] };
  return path === 'news' ? data.news ?? [] : data.organic ?? [];
}

/**
 * Finds media/coverage links for a company via the Serper search API.
 * Two fast lookups (news + interviews/podcasts), links only — no page reading, no AI, ~1–2s.
 */
export async function extractMentions(
  apiKey: string,
  company: { name?: string | null; websiteUrl: string; domain: string; category?: string | null }
): Promise<ExtractedMention[]> {
  const who = company.name || company.domain;
  // Disambiguate generic names (e.g. "Dharma") with the company's category/industry.
  const ctx = company.category ? ` ${company.category}` : '';

  const [news, talks] = await Promise.all([
    serper(apiKey, 'news', `"${who}"${ctx}`),
    serper(apiKey, 'search', `"${who}"${ctx} (interview OR podcast OR funding OR launch)`),
  ]);

  const found = new Map<string, { title: string; fromNews: boolean }>();
  for (const r of news) if (r.link && !found.has(r.link)) found.set(r.link, { title: r.title ?? '', fromNews: true });
  for (const r of talks) if (r.link && !found.has(r.link)) found.set(r.link, { title: r.title ?? '', fromNews: false });

  return [...found.entries()]
    .slice(0, 15)
    .map(([url, { title, fromNews }]) => ({ url, title: title || undefined, category: classify(url, title, fromNews) }));
}
