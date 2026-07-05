import type { Mention, MentionJob, ExtractedMention } from '../types/mentions';
import { newId } from './id';

export async function getMentions(db: D1Database, companyId: string): Promise<Mention[]> {
  const rows = await db
    .prepare('SELECT * FROM company_mentions WHERE company_id = ? ORDER BY category ASC')
    .bind(companyId)
    .all<Mention>();
  return rows.results ?? [];
}

export async function getMentionJob(db: D1Database, companyId: string): Promise<MentionJob | null> {
  return db.prepare('SELECT status, error, updated_at FROM mention_jobs WHERE company_id = ?').bind(companyId).first<MentionJob>();
}

export async function setMentionJob(db: D1Database, companyId: string, status: string, error: string | null = null): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mention_jobs (company_id, status, error, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(company_id) DO UPDATE SET status = excluded.status, error = excluded.error, updated_at = datetime('now')`
    )
    .bind(companyId, status, error)
    .run();
}

export async function saveMentions(db: D1Database, companyId: string, mentions: ExtractedMention[]): Promise<void> {
  const stmts: D1PreparedStatement[] = [db.prepare('DELETE FROM company_mentions WHERE company_id = ?').bind(companyId)];
  for (const m of mentions) {
    stmts.push(
      db
        .prepare('INSERT INTO company_mentions (id, company_id, url, title, category) VALUES (?, ?, ?, ?, ?)')
        .bind(newId(), companyId, m.url, m.title ?? null, m.category ?? 'other')
    );
  }
  await db.batch(stmts);
}
