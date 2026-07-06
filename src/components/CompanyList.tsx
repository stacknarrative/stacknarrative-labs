import { useEffect, useMemo, useState } from 'react';
import type { Company } from '../types/company';

const STORAGE_KEY = 'compareIds';

const EXPORT_COLUMNS: (keyof Company)[] = [
  'name',
  'domain',
  'category',
  'tagline',
  'headline',
  'value_proposition',
  'icp',
  'product_likes',
  'product_dislikes',
  'status',
];

function toCsv(rows: Company[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = EXPORT_COLUMNS.join(',');
  const body = rows.map((r) => EXPORT_COLUMNS.map((c) => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

export function CompanyList() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOnly, setCompareOnly] = useState(false);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json() as Promise<{ companies: Company[] }>)
      .then((data) => setCompanies(data.companies))
      .catch(() => setCompanies([]));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
      setSelected(new Set(saved));
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    localStorage.setItem(STORAGE_KEY, '[]');
    setCompareOnly(false);
  }

  const visible = useMemo(() => {
    if (!companies) return [];
    let rows = companies;
    if (compareOnly) rows = rows.filter((c) => selected.has(c.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((c) => (c.name || c.domain).toLowerCase().includes(q) || c.domain.toLowerCase().includes(q));
    }
    return rows;
  }, [companies, compareOnly, selected, query]);

  function exportSelected() {
    if (!companies) return;
    const rows = companies.filter((c) => selected.has(c.id));
    if (rows.length === 0) return;
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compare-companies.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (companies === null) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (companies.length === 0) return <p className="text-sm text-neutral-500">No companies researched yet.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setCompareOnly((v) => !v)}
          disabled={selected.size === 0}
          className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
            compareOnly ? 'bg-sky-600 text-white' : 'bg-neutral-800 text-neutral-100'
          }`}
        >
          {compareOnly ? `Comparing ${selected.size}` : `Compare selected (${selected.size})`}
        </button>
        <button
          onClick={exportSelected}
          disabled={selected.size === 0}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          Export selected
        </button>
        {selected.size > 0 && (
          <button onClick={clearSelection} className="rounded px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100">
            Clear
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Tagline</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last scanned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {visible.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-900">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td className="px-4 py-2">
                  <a href={`/companies/${c.id}`} className="hover:underline">
                    {c.name || c.domain}
                  </a>
                </td>
                <td className="px-4 py-2 text-neutral-400">{c.category || '—'}</td>
                <td className="px-4 py-2 text-neutral-400">{c.tagline || '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'verified' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-400">
                  {c.last_scanned_at ? new Date(c.last_scanned_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
