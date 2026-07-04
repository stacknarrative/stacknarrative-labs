import { useEffect, useState } from 'react';
import type { Company } from '../types/company';

export function CompanyList() {
  const [companies, setCompanies] = useState<Company[] | null>(null);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json() as Promise<{ companies: Company[] }>)
      .then((data) => setCompanies(data.companies))
      .catch(() => setCompanies([]));
  }, []);

  if (companies === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (companies.length === 0) {
    return <p className="text-sm text-neutral-500">No companies researched yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="px-4 py-2 font-medium">Company</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Last scanned</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {companies.map((c) => (
            <tr key={c.id} className="hover:bg-neutral-900">
              <td className="px-4 py-2">
                <a href={`/companies/${c.id}`} className="hover:underline">
                  {c.name || c.domain}
                </a>
              </td>
              <td className="px-4 py-2 text-neutral-400">{c.category || '—'}</td>
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
  );
}
