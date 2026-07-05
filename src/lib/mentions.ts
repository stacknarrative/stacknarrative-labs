import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedMention, MentionCategory } from '../types/mentions';

const CATEGORIES: MentionCategory[] = ['press_release', 'funding', 'product_news', 'interview', 'podcast', 'other'];

function classify(url: string, title: string): MentionCategory {
  const s = `${url} ${title}`.toLowerCase();
  if (/podcast|episode|listen|spotify|apple\.com\/.*podcast/.test(s)) return 'podcast';
  if (/interview|q&a|fireside|in conversation|sits down/.test(s)) return 'interview';
  if (/fund|raise|series [a-e]|seed|investment|valuation|venture/.test(s)) return 'funding';
  if (/launch|announc|releases?|unveil|introduc|new feature|product update/.test(s)) return 'product_news';
  if (/press|newsroom|pr-?wire|businesswire|prnewswire|press-release/.test(s)) return 'press_release';
  return 'other';
}

function harvest(content: Anthropic.ContentBlock[], into: Map<string, string>): string | null {
  let searchError: string | null = null;
  for (const block of content) {
    const b = block as unknown as { type: string; content?: unknown };
    if (b.type !== 'web_search_tool_result') continue;
    if (Array.isArray(b.content)) {
      for (const r of b.content as { type?: string; url?: string; title?: string }[]) {
        if (r?.url && !into.has(r.url)) into.set(r.url, r.title ?? '');
      }
    } else if (b.content && typeof b.content === 'object') {
      // Error shape: { type: 'web_search_tool_result_error', error_code: '...' }
      const err = b.content as { error_code?: string };
      if (err.error_code) searchError = err.error_code;
    }
  }
  return searchError;
}

/**
 * Collects URLs where the company/founder is mentioned via a short web-search pass.
 * Runs synchronously (fast enough to fit the request window) and harvests links directly
 * from the search results — pages are never opened, no multi-round reasoning.
 */
export async function extractMentions(
  apiKey: string,
  company: { name?: string | null; websiteUrl: string; domain: string; founderHint?: string | null }
): Promise<ExtractedMention[]> {
  const client = new Anthropic({ apiKey });
  const who = company.name || company.domain;
  const founderLine = company.founderHint ? ` and its founder ${company.founderHint}` : '';

  const found = new Map<string, string>();

  // ONE search round only — keeps it fast and well under Cloudflare's request limit.
  const res = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 } as unknown as Anthropic.Tool],
    messages: [
      {
        role: 'user',
        content: `Search the web for coverage of "${who}"${founderLine}: press, funding, product news, interviews, or podcasts. Do at most two searches. No summary needed — the searches are what matter.`,
      },
    ],
  });

  const searchError = harvest(res.content, found);
  if (found.size === 0 && searchError) {
    throw new Error(`web search error: ${searchError}`);
  }

  // Cap at 5 links.
  return [...found.entries()].slice(0, 5).map(([url, title]) => ({
    url,
    title: title || undefined,
    category: classify(url, title),
  }));
}

export { CATEGORIES };
