import type { FounderIntelligence, FounderDossier, FounderProfileRow, FounderInsight, FounderTimelineEntry, FounderSource } from '../types/founder';
import { newId } from './id';

export async function getFounderDossier(db: D1Database, companyId: string): Promise<FounderDossier | null> {
  const profile = await db
    .prepare('SELECT * FROM founder_profiles WHERE company_id = ?')
    .bind(companyId)
    .first<FounderProfileRow>();
  if (!profile) return null;

  const [list, insights, timeline, unknowns, srcs] = await Promise.all([
    db.prepare('SELECT kind, value FROM founder_list_items WHERE company_id = ?').bind(companyId).all<{ kind: string; value: string }>(),
    db.prepare('SELECT * FROM founder_insights WHERE company_id = ?').bind(companyId).all(),
    db.prepare('SELECT * FROM founder_timeline WHERE company_id = ?').bind(companyId).all(),
    db.prepare('SELECT question FROM founder_unknowns WHERE company_id = ?').bind(companyId).all<{ question: string }>(),
    db.prepare('SELECT * FROM founder_sources WHERE company_id = ? ORDER BY fetched_at ASC').bind(companyId).all<FounderSource>(),
  ]);

  const listRows = list.results ?? [];
  return {
    profile,
    co_founders: listRows.filter((r) => r.kind === 'co_founder').map((r) => r.value),
    previous_companies: listRows.filter((r) => r.kind === 'previous_company').map((r) => r.value),
    previous_industries: listRows.filter((r) => r.kind === 'previous_industry').map((r) => r.value),
    insights: (insights.results ?? []) as unknown as (FounderInsight & { id: string })[],
    timeline: (timeline.results ?? []) as unknown as (FounderTimelineEntry & { id: string })[],
    unknowns: (unknowns.results ?? []).map((r) => r.question),
    sources: srcs.results ?? [],
  };
}

/** Replaces any existing founder profile for this company with a fresh one. */
export async function saveFounderIntelligence(
  db: D1Database,
  companyId: string,
  data: FounderIntelligence,
  sources: { url: string; title?: string }[] = []
): Promise<void> {
  const stmts: D1PreparedStatement[] = [
    db.prepare('DELETE FROM founder_profiles WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM founder_list_items WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM founder_insights WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM founder_timeline WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM founder_unknowns WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM founder_sources WHERE company_id = ?').bind(companyId),
  ];

  const b = data.basic ?? {};
  const o = data.origin ?? {};
  stmts.push(
    db
      .prepare(
        `INSERT INTO founder_profiles
         (id, company_id, founder_name, current_role, education, years_experience, domain_expertise,
          why_started, problem_inspired, market_gap, original_vision, current_vision, vision_changed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        newId(),
        companyId,
        b.founder_name ?? null,
        b.current_role ?? null,
        b.education ?? null,
        b.years_experience ?? null,
        b.domain_expertise ?? null,
        o.why_started ?? null,
        o.problem_inspired ?? null,
        o.market_gap ?? null,
        o.original_vision ?? null,
        o.current_vision ?? null,
        o.vision_changed ?? null
      )
  );

  const listItem = (kind: string, value: string) =>
    db.prepare('INSERT INTO founder_list_items (id, company_id, kind, value) VALUES (?, ?, ?, ?)').bind(newId(), companyId, kind, value);
  for (const v of b.co_founders ?? []) stmts.push(listItem('co_founder', v));
  for (const v of b.previous_companies ?? []) stmts.push(listItem('previous_company', v));
  for (const v of b.previous_industries ?? []) stmts.push(listItem('previous_industry', v));

  for (const ins of data.insights ?? []) {
    stmts.push(
      db
        .prepare(
          'INSERT INTO founder_insights (id, company_id, section, label, detail, evidence, source_url, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(newId(), companyId, ins.section, ins.label, ins.detail ?? null, ins.evidence ?? null, ins.source_url ?? null, ins.confidence ?? null)
    );
  }

  for (const t of data.timeline ?? []) {
    stmts.push(
      db
        .prepare('INSERT INTO founder_timeline (id, company_id, event_date, event, source_url, why_it_matters) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newId(), companyId, t.date ?? null, t.event, t.source_url ?? null, t.why_it_matters ?? null)
    );
  }

  for (const q of data.unknowns ?? []) {
    stmts.push(db.prepare('INSERT INTO founder_unknowns (id, company_id, question) VALUES (?, ?, ?)').bind(newId(), companyId, q));
  }

  for (const s of sources) {
    stmts.push(
      db.prepare('INSERT INTO founder_sources (id, company_id, url, title) VALUES (?, ?, ?, ?)').bind(newId(), companyId, s.url, s.title ?? null)
    );
  }

  await db.batch(stmts);
}
