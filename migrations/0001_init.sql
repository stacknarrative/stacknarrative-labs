-- Core company record. One row per researched company.
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,          -- normalized root domain, the dedup key
  website_url TEXT NOT NULL,
  name TEXT,
  tagline TEXT,
  headline TEXT,
  subheadline TEXT,
  value_proposition TEXT,
  category TEXT,
  icp TEXT,
  about_content TEXT,
  product_likes TEXT,
  product_dislikes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'verified'
  last_scanned_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_companies_domain ON companies(domain);

CREATE TABLE founders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  linkedin_url TEXT
);

CREATE INDEX idx_founders_company ON founders(company_id);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE INDEX idx_products_company ON products(company_id);

CREATE TABLE product_features (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE INDEX idx_features_product ON product_features(product_id);

CREATE TABLE competitors (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  linked_company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  source TEXT
);

CREATE INDEX idx_competitors_company ON competitors(company_id);

CREATE TABLE pricing_tiers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tier_name TEXT,
  price TEXT,
  billing_model TEXT,
  notes TEXT
);

CREATE INDEX idx_pricing_tiers_company ON pricing_tiers(company_id);

CREATE TABLE review_themes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source TEXT,        -- 'G2' | 'Capterra' | 'Hotel Tech Report' | ...
  theme TEXT NOT NULL,
  sentiment TEXT,      -- 'praise' | 'complaint'
  excerpt TEXT
);

CREATE INDEX idx_review_themes_company ON review_themes(company_id);

-- Strategist-authored only. Never written by the AI extraction step.
CREATE TABLE positioning_notes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  gap_notes TEXT,
  whitespace_notes TEXT,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_positioning_notes_company ON positioning_notes(company_id);

-- Provenance: which source page a field's value was extracted from, and how confident the AI was.
CREATE TABLE field_sources (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  source_url TEXT,
  confidence REAL,
  extracted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_field_sources_company ON field_sources(company_id);
