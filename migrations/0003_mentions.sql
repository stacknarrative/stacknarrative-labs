-- On-demand "where is this company mentioned" link dump. URLs only — pages are never opened.
CREATE TABLE company_mentions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  category TEXT,   -- 'press_release' | 'funding' | 'product_news' | 'interview' | 'podcast' | 'other'
  found_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_company_mentions_company ON company_mentions(company_id);

-- Background job status for the mentions scan (keeps the HTTP request from timing out).
CREATE TABLE mention_jobs (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL,   -- 'running' | 'done' | 'error'
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
