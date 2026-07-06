import type { APIRoute } from 'astro';

export const prerender = false;

// Reports which bindings/secrets are present (names only — never the values).
export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env as Record<string, unknown>;
  return Response.json({
    has_DB: !!env.DB,
    has_ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY,
    has_SERPER_API_KEY: !!env.SERPER_API_KEY,
    // Names of every binding present, so a misspelled key shows up.
    keys: Object.keys(env).sort(),
  });
};
