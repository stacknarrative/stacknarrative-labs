import { useEffect, useMemo, useState } from 'react';
import type { Company } from '../types/company';
import { CATEGORIES, matchesCategory, type Category } from '../lib/categories';

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

function toCsv(rows: Company[], mentionsById: Map<string, string>): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [...EXPORT_COLUMNS, 'mentions'].join(',');
  const body = rows
    .map((r) => [...EXPORT_COLUMNS.map((c) => esc(r[c])), esc(mentionsById.get(r.id) ?? '')].join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function CompanyList() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOnly, setCompareOnly] = useState(false);
  const [rescanning, setRescanning] = useState<{ done: number; total: number } | null>(null);

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
    if (category !== 'All') {
      rows = rows.filter((c) =>
        matchesCategory([c.category, c.tagline, c.headline, c.value_proposition].filter(Boolean).join(' '), category)
      );
    }
    return rows;
  }, [companies, compareOnly, selected, query, category]);

  async function rescanSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setRescanning({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      try {
        await fetch(`/api/companies/${ids[i]}/rescan`, { method: 'POST' });
      } catch {
        /* keep going */
      }
      setRescanning({ done: i + 1, total: ids.length });
    }
    // Reload the table with fresh data.
    const res = await fetch('/api/companies');
    const data = (await res.json()) as { companies: Company[] };
    setCompanies(data.companies);
    setRescanning(null);
  }

  async function exportSelected() {
    if (!companies) return;
    const rows = companies.filter((c) => selected.has(c.id));
    if (rows.length === 0) return;

    // Fetch each selected company's mention links to include in the export.
    const mentionsById = new Map<string, string>();
    await Promise.all(
      rows.map(async (c) => {
        try {
          const res = await fetch(`/api/companies/${c.id}/mentions`);
          const d = (await res.json()) as { mentions?: { category?: string | null; url: string }[] };
          mentionsById.set(c.id, (d.mentions ?? []).map((m) => `[${m.category ?? 'other'}] ${m.url}`).join(' | '));
        } catch {
          /* leave empty */
        }
      })
    );

    const blob = new Blob([toCsv(rows, mentionsById)], { type: 'text/csv;charset=utf-8' });
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'All')}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
        <button
          onClick={rescanSelected}
          disabled={selected.size === 0 || rescanning !== null}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {rescanning ? `Re-scanning ${rescanning.done}/${rescanning.total}…` : 'Re-scan selected'}
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
