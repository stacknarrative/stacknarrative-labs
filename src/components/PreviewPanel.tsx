import { useState } from 'react';
import type { CompanyDossier, ExtractedCompanyData } from '../types/company';
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

export interface PreviewData {
  domain: string;
  websiteUrl: string;
  sourceUrl: string;
  extracted: ExtractedCompanyData;
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {items.map((item, i) => (
        <span key={i} className="rounded bg-neutral-800 px-2 py-1">
          {item}
        </span>
      ))}
    </div>
  );
}

export function PreviewPanel({ preview }: { preview: PreviewData }) {
  const { extracted } = preview;
  const [fields, setFields] = useState({
    name: extracted.name ?? '',
    tagline: extracted.tagline ?? '',
    headline: extracted.headline ?? '',
    subheadline: extracted.subheadline ?? '',
    value_proposition: extracted.value_proposition ?? '',
    category: extracted.category ?? '',
    icp: extracted.icp ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<CompanyDossier | null>(null);

  if (saved) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400">Saved to the database and marked verified.</p>
        <DossierView company={saved} />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/companies/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: preview.domain,
          websiteUrl: preview.websiteUrl,
          sourceUrl: preview.sourceUrl,
          extracted,
          fields,
        }),
      });
      const data = (await res.json()) as { error?: string; company: CompanyDossier };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(data.company);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-300">
        This is a preview — nothing has been saved yet. Review the fields below, then click{' '}
        <strong>Save to database</strong> to keep it, or just navigate away to discard it.
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
        {saving ? 'Saving…' : 'Save to database'}
      </button>

      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        {extracted.founders?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">Founders</h3>
            <ul className="space-y-1 text-sm">
              {extracted.founders.map((f, i) => (
                <li key={i}>
                  {f.name}
                  {f.title ? ` — ${f.title}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {extracted.products?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">Products</h3>
            <div className="space-y-3">
              {extracted.products.map((p, i) => (
                <div key={i}>
                  <p className="font-medium">{p.name}</p>
                  {p.description && <p className="text-sm text-neutral-400">{p.description}</p>}
                  {p.features?.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-sm text-neutral-300">
                      {p.features.map((feat, j) => (
                        <li key={j}>
                          {feat.name}
                          {feat.description ? ` — ${feat.description}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {extracted.competitors?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">Competitors mentioned</h3>
            <Chips items={extracted.competitors.map((c) => c.competitor_name)} />
          </div>
        )}

        {extracted.pricing_tiers?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">Pricing</h3>
            <ul className="space-y-1 text-sm">
              {extracted.pricing_tiers.map((t, i) => (
                <li key={i}>
                  {t.tier_name || 'Tier'}: {t.price || 'n/a'} {t.billing_model ? `(${t.billing_model})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
