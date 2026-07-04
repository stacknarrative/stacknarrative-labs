import { useState } from 'react';
import type { CompanyDossier } from '../types/company';
import { DossierView } from './DossierView';
import { PreviewPanel, type PreviewData } from './PreviewPanel';

type Result = { kind: 'duplicate'; company: CompanyDossier } | { kind: 'preview'; preview: PreviewData } | null;

export function ResearchForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        error?: string;
        duplicate?: boolean;
        company?: CompanyDossier;
        domain?: string;
        websiteUrl?: string;
        sourceUrl?: string;
        extracted?: PreviewData['extracted'];
      };
      if (!res.ok) {
        throw new Error(data.error || 'Research failed');
      }
      if (data.duplicate && data.company) {
        setResult({ kind: 'duplicate', company: data.company });
      } else if (data.domain && data.websiteUrl && data.sourceUrl && data.extracted) {
        setResult({
          kind: 'preview',
          preview: { domain: data.domain, websiteUrl: data.websiteUrl, sourceUrl: data.sourceUrl, extracted: data.extracted },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g. mews.com"
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {loading ? 'Researching…' : 'Research'}
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result?.kind === 'duplicate' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-sky-900 bg-sky-950/40 p-4 text-sm text-sky-300">
            This company was already researched
            {result.company.last_scanned_at ? ` on ${new Date(result.company.last_scanned_at).toLocaleDateString()}` : ''}.
            Showing the existing record below.
          </div>
          <DossierView company={result.company} />
        </div>
      )}

      {result?.kind === 'preview' && <PreviewPanel preview={result.preview} />}
    </div>
  );
}
