import Anthropic from '@anthropic-ai/sdk';
import type { FounderIntelligence } from '../types/founder';

const CONFIDENCE = { type: 'string', enum: ['High', 'Medium', 'Low'] };

const SCHEMA = {
  type: 'object' as const,
  properties: {
    basic: {
      type: 'object',
      properties: {
        founder_name: { type: 'string' },
        co_founders: { type: 'array', items: { type: 'string' } },
        current_role: { type: 'string' },
        previous_companies: { type: 'array', items: { type: 'string' } },
        previous_industries: { type: 'array', items: { type: 'string' } },
        education: { type: 'string' },
        years_experience: { type: 'string' },
        domain_expertise: { type: 'string' },
      },
    },
    origin: {
      type: 'object',
      properties: {
        why_started: { type: 'string' },
        problem_inspired: { type: 'string' },
        market_gap: { type: 'string' },
        original_vision: { type: 'string' },
        current_vision: { type: 'string' },
        vision_changed: { type: 'string' },
      },
    },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: [
              'philosophy',
              'strategic_thinking',
              'customer_understanding',
              'product_vision',
              'market_view',
              'language',
              'leadership',
              'strategic_signal',
            ],
          },
          label: { type: 'string' },
          detail: { type: 'string' },
          evidence: { type: 'string' },
          source_url: { type: 'string' },
          confidence: CONFIDENCE,
        },
        required: ['section', 'label'],
      },
    },
    timeline: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          event: { type: 'string' },
          source_url: { type: 'string' },
          why_it_matters: { type: 'string' },
        },
        required: ['event'],
      },
    },
    unknowns: { type: 'array', items: { type: 'string' } },
  },
  required: ['basic', 'origin', 'insights', 'timeline', 'unknowns'],
};

const SYSTEM = `You are a strategic intelligence analyst at Stack Narrative Labs. You build Founder Intelligence Profiles that explain how a founder's thinking shapes the company's positioning, product strategy, and market direction — not biographies.

Use ONLY publicly available information: the company's own About/Leadership/founder pages, company and founder blogs, newsletters, public interviews, podcast transcripts, conference talks, keynotes, webinars, public videos, press interviews, press releases, open letters, and public announcements.

Rules:
- Never hallucinate. Never infer a fact without evidence.
- If evidence is unavailable, omit the field or add the question to "unknowns".
- Every entry in "insights" and "timeline" must carry an evidence snippet, a source_url, and a confidence of High/Medium/Low.
- Clearly separate fact from interpretation.
- Search the web to find primary sources before concluding.`;

/**
 * Runs founder intelligence for one company. Uses the web_search server tool so the model
 * can pull from public sources with citations — no direct third-party scraping.
 */
export interface FounderResult {
  data: FounderIntelligence;
  sources: { url: string; title?: string }[];
}

export async function extractFounderIntelligence(
  apiKey: string,
  company: { name?: string | null; websiteUrl: string; domain: string; founderHint?: string | null }
): Promise<FounderResult> {
  const client = new Anthropic({ apiKey });
  const sources = new Map<string, string | undefined>();

  const collectSources = (content: Anthropic.ContentBlock[]) => {
    for (const block of content) {
      const b = block as unknown as { type: string; content?: unknown };
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
        for (const r of b.content as { type?: string; url?: string; title?: string }[]) {
          if (r?.url && !sources.has(r.url)) sources.set(r.url, r.title);
        }
      }
    }
  };

  const who = company.name || company.domain;
  const founderLine = company.founderHint ? `Known founder to start from: ${company.founderHint}.` : '';

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Build a Founder Intelligence Profile for the founder(s) of ${who} (${company.websiteUrl}). ${founderLine}
Search the web for public sources, then call record_founder_intelligence exactly once with the complete structured profile. Do not call it until you have gathered evidence.`,
    },
  ];

  // Manual loop: let the model run web_search (server-side) and pause_turn as needed,
  // until it emits the record_founder_intelligence tool call.
  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      system: SYSTEM,
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 12 } as unknown as Anthropic.Tool,
        {
          name: 'record_founder_intelligence',
          description: 'Records the completed structured Founder Intelligence Profile.',
          input_schema: SCHEMA,
        },
      ],
      messages,
    });

    collectSources(res.content);

    const record = res.content.find(
      (b) => b.type === 'tool_use' && b.name === 'record_founder_intelligence'
    );
    if (record && record.type === 'tool_use') {
      return {
        data: record.input as FounderIntelligence,
        sources: [...sources.entries()].map(([url, title]) => ({ url, title })),
      };
    }

    // Not done yet: server tools may have run (pause_turn) — feed the turn back and continue.
    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason === 'pause_turn') {
      continue;
    }
    // Model ended its turn without recording — nudge it once.
    messages.push({
      role: 'user',
      content: 'Now call record_founder_intelligence exactly once with everything you found.',
    });
  }

  throw new Error('Founder intelligence did not complete within the step budget');
}
