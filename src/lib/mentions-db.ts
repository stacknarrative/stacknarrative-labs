import type { Mention, ExtractedMention } from '../types/mentions';
import { newId } from './id';

export async function getMentions(db: D1Database, companyId: string): Promise<Mention[]> {
  const rows = await db
    .prepare('SELECT * FROM company_mentions WHERE company_id = ? ORDER BY category ASC')
    .bind(companyId)
    .all<Mention>();
  return rows.results ?? [];
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
