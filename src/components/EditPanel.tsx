import { useState } from 'react';

const FIELDS: { key: string; label: string; big?: boolean }[] = [
  { key: 'name', label: 'Company name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'headline', label: 'Headline' },
  { key: 'subheadline', label: 'Subheadline' },
  { key: 'category', label: 'Category' },
  { key: 'icp', label: 'ICP', big: true },
  { key: 'value_proposition', label: 'Value proposition', big: true },
  { key: 'about_content', label: 'About / Our Story', big: true },
];

type Fields = Record<string, string>;

export function EditPanel({ companyId, initial }: { companyId: string; initial: Fields }) {
  const [fields, setFields] = useState<Fields>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold">Edit company details</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, big }) => (
          <label key={key} className={`flex flex-col gap-1 text-sm ${big ? 'sm:col-span-2' : ''}`}>
            <span className="text-neutral-400">{label}</span>
            <textarea
              className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
              rows={big ? 4 : 1}
              value={fields[key] ?? ''}
              onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save details'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved.</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
