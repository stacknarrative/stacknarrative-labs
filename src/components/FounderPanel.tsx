import { useEffect, useRef, useState } from 'react';
import type { FounderDossier, InsightSection } from '../types/founder';

type Job = { status: 'running' | 'done' | 'error'; error?: string | null } | null;

const SECTION_LABELS: Record<InsightSection, string> = {
  philosophy: 'Founder philosophy',
  strategic_thinking: 'Strategic thinking',
  customer_understanding: 'Customer understanding',
  product_vision: 'Product vision',
  market_view: 'Market view',
  language: 'Language analysis',
  leadership: 'Leadership signals',
  strategic_signal: 'Strategic signals',
};

const SECTION_ORDER = Object.keys(SECTION_LABELS) as InsightSection[];

function ConfidenceTag({ c }: { c?: string | null }) {
  if (!c) return null;
  const color =
    c === 'High' ? 'bg-emerald-900 text-emerald-300' : c === 'Medium' ? 'bg-amber-900 text-amber-300' : 'bg-neutral-800 text-neutral-400';
  return <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${color}`}>{c}</span>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd>{value || 'Unknown'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-800 py-4">
      <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </div>
  );
}

export function FounderPanel({ companyId }: { companyId: string }) {
  const [dossier, setDossier] = useState<FounderDossier | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    const res = await fetch(`/api/companies/${companyId}/founder`);
    const d = (await res.json()) as { founder: FounderDossier | null; job: Job };
    setDossier(d.founder);
    if (d.job?.status === 'running') {
      setRunning(true);
    } else {
      setRunning(false);
      if (pollRef.current) clearInterval(pollRef.current);
      if (d.job?.status === 'error') setError(d.job.error || 'Founder research failed');
    }
    return d.job?.status;
  }

  useEffect(() => {
    refresh()
      .then((status) => {
        if (status === 'running') startPolling();
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      refresh().catch(() => {});
    }, 5000);
  }

  async function run() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/founder`, { method: 'POST' });
      if (!res.ok && res.status !== 202) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to start');
      }
      startPolling();
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (!loaded) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Founder intelligence</h2>
        <button
          onClick={run}
          disabled={running}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {running ? 'Researching…' : dossier ? 'Re-run' : 'Run founder research'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {running && (
        <p className="text-sm text-neutral-500">
          Searching public sources (interviews, blogs, talks, press) and building the profile. This runs in the
          background and can take 2–4 minutes — you can leave this page and come back; it keeps updating automatically.
        </p>
      )}

      {!dossier && !running && (
        <p className="text-sm text-neutral-500">No founder profile yet. Click “Run founder research” to build one.</p>
      )}

      {dossier && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <Section title="Basic information">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Founder" value={dossier.profile.founder_name} />
              <Field label="Current role" value={dossier.profile.current_role} />
              <Field label="Co-founders" value={dossier.co_founders.join(', ')} />
              <Field label="Previous companies" value={dossier.previous_companies.join(', ')} />
              <Field label="Previous industries" value={dossier.previous_industries.join(', ')} />
              <Field label="Education" value={dossier.profile.education} />
              <Field label="Years of experience" value={dossier.profile.years_experience} />
              <Field label="Domain expertise" value={dossier.profile.domain_expertise} />
            </dl>
          </Section>

          <Section title="Company origin">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Why started" value={dossier.profile.why_started} />
              <Field label="Problem that inspired it" value={dossier.profile.problem_inspired} />
              <Field label="Market gap identified" value={dossier.profile.market_gap} />
              <Field label="Original vision" value={dossier.profile.original_vision} />
              <Field label="Current vision" value={dossier.profile.current_vision} />
              <Field label="Vision changed?" value={dossier.profile.vision_changed} />
            </dl>
          </Section>

          {SECTION_ORDER.map((section) => {
            const items = dossier.insights.filter((i) => i.section === section);
            if (items.length === 0) return null;
            return (
              <Section key={section} title={SECTION_LABELS[section]}>
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={i.id} className="text-sm">
                      <span className="font-medium">{i.label}</span>
                      <ConfidenceTag c={i.confidence} />
                      {i.detail && <p className="text-neutral-300">{i.detail}</p>}
                      {i.evidence && <p className="text-neutral-500 italic">“{i.evidence}”</p>}
                      {i.source_url && (
                        <a href={i.source_url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">
                          {i.source_url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            );
          })}

          {dossier.timeline.length > 0 && (
            <Section title="Timeline">
              <ul className="space-y-3">
                {dossier.timeline.map((t) => (
                  <li key={t.id} className="text-sm">
                    <span className="font-medium">{t.date || '—'}</span> — {t.event}
                    {t.why_it_matters && <p className="text-neutral-400">Why it matters: {t.why_it_matters}</p>}
                    {t.source_url && (
                      <a href={t.source_url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">
                        {t.source_url}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {dossier.unknowns.length > 0 && (
            <Section title="Unknowns">
              <ul className="list-inside list-disc text-sm text-neutral-400">
                {dossier.unknowns.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </Section>
          )}

          {dossier.sources.length > 0 && (
            <Section title={`Sources consulted (${dossier.sources.length})`}>
              <ul className="space-y-1 text-sm">
                {dossier.sources.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                      {s.title || s.url}
                    </a>
                    {s.title && <span className="ml-2 text-xs text-neutral-600">{s.url}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
