-- Media/coverage links for a company, populated on demand via the Serper search API. URLs only.
CREATE TABLE company_mentions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  category TEXT,   -- 'press_release' | 'funding' | 'product_news' | 'interview' | 'podcast' | 'other'
  found_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_company_mentions_company ON company_mentions(company_id);
