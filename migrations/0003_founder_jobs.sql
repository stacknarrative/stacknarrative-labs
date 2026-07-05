-- Tracks background founder-research jobs so long runs don't block the HTTP request (avoids 524 timeouts).
CREATE TABLE founder_jobs (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL,   -- 'running' | 'done' | 'error'
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
