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

function harvest(content: Anthropic.ContentBlock[], into: Map<string, string>) {
  for (const block of content) {
    const b = block as unknown as { type: string; content?: unknown };
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content as { type?: string; url?: string; title?: string }[]) {
        if (r?.url && !into.has(r.url)) into.set(r.url, r.title ?? '');
      }
    }
  }
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

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Search the web for coverage of "${who}"${founderLine}: press releases, funding news, product announcements, founder interviews, and podcasts. Run a handful of targeted searches. You do not need to write a summary — the searches are what matter.`,
    },
  ];

  const found = new Map<string, string>();

  // Let the server-side search finish; continue only on pause_turn (bounded, not agentic).
  for (let i = 0; i < 3; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 } as unknown as Anthropic.Tool],
      messages,
    });
    harvest(res.content, found);
    if (res.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: res.content });
  }

  return [...found.entries()].map(([url, title]) => ({
    url,
    title: title || undefined,
    category: classify(url, title),
  }));
}

export { CATEGORIES };
