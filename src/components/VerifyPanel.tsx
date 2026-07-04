import { useState } from 'react';
import type { CompanyDossier } from '../types/company';
import { DossierView } from './DossierView';

const EDITABLE_FIELDS = [
  { key: 'name', label: 'Company name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'headline', label: 'Headline' },
  { key: 'subheadline', label: 'Subheadline' },
  { key: 'value_proposition', label: 'Value proposition' },
  { key: 'category', label: 'Category' },
  { key: 'icp', label: 'ICP' },
] as const;

export function VerifyPanel({ company: initial }: { company: CompanyDossier }) {
  const [company, setCompany] = useState(initial);
  const [fields, setFields] = useState({
    name: initial.name ?? '',
    tagline: initial.tagline ?? '',
    headline: initial.headline ?? '',
    subheadline: initial.subheadline ?? '',
    value_proposition: initial.value_proposition ?? '',
    category: initial.category ?? '',
    icp: initial.icp ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (company.status === 'verified') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400">Saved and marked verified.</p>
        <DossierView company={company} />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${initial.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = (await res.json()) as { company: CompanyDossier };
      setCompany(data.company);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-300">
        AI drafted these fields from {company.website_url}. Review and correct before saving — nothing here is
        considered final until you verify it.
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6 sm:grid-cols-2">
        {EDITABLE_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-400">{label}</span>
            <textarea
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
              rows={key === 'value_proposition' || key === 'icp' ? 3 : 1}
              value={fields[key]}
              onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save as verified'}
      </button>

      <div className="pt-4">
        <DossierView company={{ ...company, ...fields }} />
      </div>
    </div>
  );
}
