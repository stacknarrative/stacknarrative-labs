import { useEffect, useState } from 'react';
import type { Mention, MentionCategory } from '../types/mentions';

const CATEGORY_LABELS: Record<MentionCategory, string> = {
  press_release: 'Press releases',
  funding: 'Funding news',
  product_news: 'Product news',
  interview: 'Founder interviews',
  podcast: 'Podcasts',
  other: 'Other mentions',
};

const CATEGORY_ORDER: MentionCategory[] = ['press_release', 'funding', 'product_news', 'interview', 'podcast', 'other'];

export function MentionsPanel({ companyId }: { companyId: string }) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/companies/${companyId}/mentions`)
      .then((r) => r.json() as Promise<{ mentions: Mention[] }>)
      .then((d) => setMentions(d.mentions ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [companyId]);

  async function run() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/mentions`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; mentions?: Mention[] };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMentions(data.mentions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setRunning(false);
    }
  }

  if (!loaded) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mentions &amp; coverage links</h2>
        <button
          onClick={run}
          disabled={running}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {running ? 'Scanning…' : mentions.length > 0 ? 'Re-scan' : 'Scan for mentions'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!running && mentions.length === 0 && !error && (
        <p className="text-sm text-neutral-500">No mention links yet. Click “Scan for mentions”.</p>
      )}

      {mentions.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = mentions.filter((m) => (m.category || 'other') === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="border-t border-neutral-800 py-4 first:border-t-0 first:pt-0">
                <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
                  {CATEGORY_LABELS[cat]} ({items.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {items.map((m) => (
                    <li key={m.id}>
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                        {m.title || m.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
