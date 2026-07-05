import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedMention } from '../types/mentions';

const SCHEMA = {
  type: 'object' as const,
  properties: {
    mentions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['press_release', 'funding', 'product_news', 'interview', 'podcast', 'other'],
          },
        },
        required: ['url'],
      },
    },
  },
  required: ['mentions'],
};

/**
 * Finds URLs where the company/founder is mentioned (press, funding, product news, interviews,
 * podcasts) via a minimal web search. Only the links are collected — pages are never opened.
 */
export async function extractMentions(
  apiKey: string,
  company: { name?: string | null; websiteUrl: string; domain: string; founderHint?: string | null }
): Promise<ExtractedMention[]> {
  const client = new Anthropic({ apiKey });
  const who = company.name || company.domain;
  const founderLine = company.founderHint ? ` Founder: ${company.founderHint}.` : '';

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Find public URLs where "${who}" (${company.websiteUrl})${founderLine} is mentioned: press releases, funding news, product announcements, founder interviews, and podcasts. Do a few targeted searches, then call record_mentions with the links you found (URL + short title + category). Do NOT open or summarize the pages — links only. Keep searches minimal.`,
    },
  ];

  for (let i = 0; i < 4; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 6 } as unknown as Anthropic.Tool,
        {
          name: 'record_mentions',
          description: 'Records the list of links where the company/founder is mentioned.',
          input_schema: SCHEMA,
        },
      ],
      messages,
    });

    const record = res.content.find((b) => b.type === 'tool_use' && b.name === 'record_mentions');
    if (record && record.type === 'tool_use') {
      const out = (record.input as { mentions?: ExtractedMention[] }).mentions ?? [];
      // Dedup by URL.
      const seen = new Set<string>();
      return out.filter((m) => m.url && !seen.has(m.url) && seen.add(m.url));
    }

    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason === 'pause_turn') continue;
    messages.push({ role: 'user', content: 'Now call record_mentions with the links you found.' });
  }

  throw new Error('Mentions scan did not complete within the step budget');
}
