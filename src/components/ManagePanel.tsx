import { useState } from 'react';

const CLEARABLE: { key: string; label: string }[] = [
  { key: 'name', label: 'Company name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'headline', label: 'Headline' },
  { key: 'subheadline', label: 'Subheadline' },
  { key: 'value_proposition', label: 'Value proposition' },
  { key: 'category', label: 'Category' },
  { key: 'icp', label: 'ICP' },
  { key: 'about_content', label: 'About / Our Story' },
  { key: 'reviews', label: 'Reviews (likes & dislikes)' },
  { key: 'founders', label: 'Founders' },
  { key: 'products', label: 'Products' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'mentions', label: 'Mention links' },
];

export function ManagePanel({ companyId }: { companyId: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'clear' | 'rescan' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(k: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function clearFields() {
    if (sel.size === 0) return;
    setBusy('clear');
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [...sel] }),
      });
      if (!res.ok) throw new Error('Clear failed');
      setMsg('Cleared. Reloading…');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setBusy(null);
    }
  }

  async function deleteCompany() {
    if (!confirm('Delete this company and all its data? This cannot be undone.')) return;
    setBusy('clear');
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(null);
    }
  }

  async function rescan() {
    setBusy('rescan');
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/rescan`, { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Re-scan failed');
      setMsg('Re-scanned. Reloading…');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-scan failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage data</h2>
        <button
          onClick={rescan}
          disabled={busy !== null}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === 'rescan' ? 'Re-scanning…' : 'Re-scan website'}
        </button>
      </div>

      <p className="text-sm text-neutral-500">Select fields to delete, then clear. Re-scan pulls fresh data from the website (reviews are kept).</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CLEARABLE.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sel.has(key)} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={clearFields}
          disabled={busy !== null || sel.size === 0}
          className="rounded bg-red-900 px-3 py-1.5 text-sm font-medium text-red-100 disabled:opacity-40"
        >
          {busy === 'clear' ? 'Clearing…' : `Clear selected (${sel.size})`}
        </button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <button
          onClick={deleteCompany}
          disabled={busy !== null}
          className="rounded border border-red-800 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-950 disabled:opacity-40"
        >
          Delete this company
        </button>
      </div>
    </div>
  );
}
