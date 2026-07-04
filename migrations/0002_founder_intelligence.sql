-- Founder Intelligence module. One profile per company; evidence-bearing rows are relational.

CREATE TABLE founder_profiles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  founder_name TEXT,
  current_role TEXT,
  education TEXT,
  years_experience TEXT,
  domain_expertise TEXT,
  why_started TEXT,
  problem_inspired TEXT,
  market_gap TEXT,
  original_vision TEXT,
  current_vision TEXT,
  vision_changed TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Co-founders, previous companies, previous industries.
CREATE TABLE founder_list_items (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,   -- 'co_founder' | 'previous_company' | 'previous_industry'
  value TEXT NOT NULL
);

CREATE INDEX idx_founder_list_company ON founder_list_items(company_id);

-- Every evidence-backed conclusion (philosophy, strategic thinking, customer understanding,
-- product vision, market view, language, leadership, strategic signals).
CREATE TABLE founder_insights (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  section TEXT NOT NULL,        -- 'philosophy' | 'strategic_thinking' | 'customer_understanding'
                                -- | 'product_vision' | 'market_view' | 'language'
                                -- | 'leadership' | 'strategic_signal'
  label TEXT NOT NULL,
  detail TEXT,
  evidence TEXT,
  source_url TEXT,
  confidence TEXT              -- 'High' | 'Medium' | 'Low'
);

CREATE INDEX idx_founder_insights_company ON founder_insights(company_id);

CREATE TABLE founder_timeline (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_date TEXT,
  event TEXT NOT NULL,
  source_url TEXT,
  why_it_matters TEXT
);

CREATE INDEX idx_founder_timeline_company ON founder_timeline(company_id);

CREATE TABLE founder_unknowns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  question TEXT NOT NULL
);

CREATE INDEX idx_founder_unknowns_company ON founder_unknowns(company_id);

-- Every source URL the founder web search actually consulted, kept as a permanent audit trail.
CREATE TABLE founder_sources (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_founder_sources_company ON founder_sources(company_id);
