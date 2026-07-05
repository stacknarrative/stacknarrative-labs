import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedCompanyData } from '../types/company';
import type { ScrapedPage } from './scraper';

const EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', description: 'Company/brand name' },
    tagline: { type: 'string', description: 'Short brand tagline, if present' },
    headline: { type: 'string', description: 'Main hero headline on the homepage' },
    subheadline: { type: 'string', description: 'Supporting text under the hero headline' },
    value_proposition: { type: 'string', description: 'The core value proposition in one or two sentences' },
    category: { type: 'string', description: 'The product category this company claims to be in' },
    icp: { type: 'string', description: 'Ideal customer profile / target segment as implied by the site' },
    about_dump: {
      type: 'string',
      description:
        'A thorough plain-text dump of everything found on the About / Our Story / Company pages: history, founding story, mission, values, milestones, team, culture, locations, any facts stated. Capture it all; do not summarize away detail.',
    },
    founders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          linkedin_url: { type: 'string' },
        },
        required: ['name'],
      },
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          features: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
        required: ['name', 'features'],
      },
    },
    competitors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          competitor_name: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['competitor_name'],
      },
    },
    pricing_tiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier_name: { type: 'string' },
          price: { type: 'string' },
          billing_model: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
  required: ['founders', 'products', 'competitors', 'pricing_tiers'],
};

/**
 * Sends scraped homepage text to Claude and gets back structured company data.
 * Every field here is treated as a *draft* — the caller must route it through
 * human verification before it's considered trustworthy (see db.verifyCompany).
 */
export async function extractCompanyData(apiKey: string, page: ScrapedPage): Promise<ExtractedCompanyData> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    tools: [
      {
        name: 'record_company_data',
        description: 'Records structured company research data extracted from a website.',
        input_schema: EXTRACTION_SCHEMA,
      },
    ],
    tool_choice: { type: 'tool', name: 'record_company_data' },
    messages: [
      {
        role: 'user',
        content: `You are extracting company research data for a B2B positioning/marketing analyst.
Source page: ${page.url}
Page title: ${page.title}

Visible homepage text:
"""
${page.text}
"""

About / Our Story / Company page text (may be empty):
"""
${page.aboutText || '(none found)'}
"""

Fill "about_dump" with everything of substance from the About / Our Story / Company page text above — history, founding story, mission, values, milestones, team, culture, locations, and any stated facts. If no about pages were found, leave it out.

Always fill in "name" and "tagline": infer the company name from the page title, logo, hero copy, or the domain (${page.url}), and the tagline from the hero headline or title — these are always derivable, so never leave them blank.

For all other fields, extract every field you can find evidence for, and leave a field out entirely rather than guessing when the page gives no evidence. Do not invent founders, products, or pricing that aren't mentioned.`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not return structured tool output');
  }

  return toolUse.input as ExtractedCompanyData;
}
