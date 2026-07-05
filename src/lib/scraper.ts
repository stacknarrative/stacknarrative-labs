import * as cheerio from 'cheerio';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  aboutText: string;
  aboutUrls: string[];
}

const USER_AGENT = 'StackNarrativeLabsBot/0.1 (+https://labs.stacknarrative.com)';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ABOUT_PAGES = 3;

// Link text / hrefs that indicate an about / story / company page.
const ABOUT_RE = /about|our[-\s]?story|our[-\s]?company|who[-\s]?we[-\s]?are|company|mission|our[-\s]?journey/i;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function bodyText($: cheerio.CheerioAPI, limit: number): string {
  $('script, style, noscript, svg').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * Fetches the homepage plus any About/Our Story/Company pages linked from it.
 * Only these pages are read — not the whole site — and the total is bounded to keep tokens low.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const homeHtml = await fetchHtml(url);
  const $ = cheerio.load(homeHtml);
  const title = $('title').first().text().trim();

  // Find about-ish links on the homepage, same host only.
  const home = new URL(url);
  const aboutUrls: string[] = [];
  $('a').each((_, el) => {
    if (aboutUrls.length >= MAX_ABOUT_PAGES) return;
    const label = $(el).text().trim();
    const href = $(el).attr('href');
    if (!href) return;
    let abs: URL;
    try {
      abs = new URL(href, url);
    } catch {
      return;
    }
    if (abs.host !== home.host) return;
    if (!ABOUT_RE.test(label) && !ABOUT_RE.test(abs.pathname)) return;
    const clean = abs.origin + abs.pathname;
    if (clean === home.origin + home.pathname) return; // skip the homepage itself
    if (!aboutUrls.includes(clean)) aboutUrls.push(clean);
  });

  const text = bodyText($, 20_000);

  // Fetch the about pages and concatenate their text (bounded).
  const aboutParts: string[] = [];
  for (const aboutUrl of aboutUrls) {
    try {
      const html = await fetchHtml(aboutUrl);
      const t = bodyText(cheerio.load(html), 8_000);
      if (t) aboutParts.push(`# ${aboutUrl}\n${t}`);
    } catch {
      // Skip pages that fail to load; don't fail the whole scrape.
    }
  }

  return { url, title, text, aboutText: aboutParts.join('\n\n').slice(0, 16_000), aboutUrls };
}
