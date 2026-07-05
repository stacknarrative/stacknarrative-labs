import type { CompanyDossier } from '../types/company';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-800 py-4">
      <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </div>
  );
}

export function DossierView({ company }: { company: CompanyDossier }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{company.name || company.domain}</h2>
          <a href={company.website_url} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 hover:underline">
            {company.website_url}
          </a>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            company.status === 'verified' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
          }`}
        >
          {company.status}
        </span>
      </div>

      {company.tagline && <p className="mt-2 text-neutral-300">{company.tagline}</p>}

      <Section title="Positioning">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Headline</dt>
            <dd>{company.headline || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Subheadline</dt>
            <dd>{company.subheadline || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Value proposition</dt>
            <dd>{company.value_proposition || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Category</dt>
            <dd>{company.category || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">ICP</dt>
            <dd>{company.icp || '—'}</dd>
          </div>
        </dl>
      </Section>

      {company.about_content && (
        <Section title="About / Our Story">
          <p className="whitespace-pre-wrap text-sm text-neutral-300">{company.about_content}</p>
        </Section>
      )}

      {company.founders.length > 0 && (
        <Section title="Founders">
          <ul className="space-y-1">
            {company.founders.map((f) => (
              <li key={f.id}>
                {f.name}
                {f.title ? ` — ${f.title}` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {company.products.length > 0 && (
        <Section title="Products">
          <div className="space-y-3">
            {company.products.map((p) => (
              <div key={p.id}>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="text-sm text-neutral-400">{p.description}</p>}
                {p.features.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm text-neutral-300">
                    {p.features.map((feat) => (
                      <li key={feat.id}>
                        {feat.name}
                        {feat.description ? ` — ${feat.description}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {company.competitors.length > 0 && (
        <Section title="Competitors mentioned">
          <div className="flex flex-wrap gap-2 text-sm">
            {company.competitors.map((c) => (
              <span key={c.id} className="rounded bg-neutral-800 px-2 py-1">
                {c.competitor_name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {company.pricing_tiers.length > 0 && (
        <Section title="Pricing">
          <ul className="space-y-1 text-sm">
            {company.pricing_tiers.map((t) => (
              <li key={t.id}>
                {t.tier_name || 'Tier'}: {t.price || 'n/a'} {t.billing_model ? `(${t.billing_model})` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {company.last_scanned_at && (
        <p className="mt-4 text-xs text-neutral-500">Last scanned {new Date(company.last_scanned_at).toLocaleString()}</p>
      )}
    </div>
  );
}
