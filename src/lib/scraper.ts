import * as cheerio from 'cheerio';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  navLinks: { label: string; url: string }[];
}

const USER_AGENT = 'StackNarrativeLabsBot/0.1 (+https://labs.stacknarrative.com)';
const FETCH_TIMEOUT_MS = 15_000;

/** Fetches a page and reduces it to the visible text + nav links an LLM needs for extraction. */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`Fetch failed with status ${res.status} for ${url}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);
  $('script, style, noscript, svg').remove();

  const title = $('title').first().text().trim();

  const navLinks: { label: string; url: string }[] = [];
  $('nav a, header a').each((_, el) => {
    const label = $(el).text().trim();
    const href = $(el).attr('href');
    if (label && href) {
      navLinks.push({ label, url: new URL(href, url).toString() });
    }
  });

  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20_000); // keep the LLM prompt bounded

  return { url, title, text, navLinks };
}
