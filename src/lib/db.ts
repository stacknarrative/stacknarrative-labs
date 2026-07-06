import type {
  Company,
  CompanyDossier,
  ExtractedCompanyData,
  Founder,
  Product,
  ProductFeature,
  Competitor,
  PricingTier,
} from '../types/company';
import { newId } from './id';

/** Thin repository layer over the D1 binding. Pass `locals.runtime.env.DB` in. */

export async function findCompanyByDomain(db: D1Database, domain: string): Promise<Company | null> {
  const row = await db.prepare('SELECT * FROM companies WHERE domain = ?').bind(domain).first<Company>();
  return row ?? null;
}

export async function getCompanyDossier(db: D1Database, companyId: string): Promise<CompanyDossier | null> {
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').bind(companyId).first<Company>();
  if (!company) return null;

  const [founders, products, features, competitors, pricingTiers, reviewThemes, positioningNotes, fieldSources] =
    await Promise.all([
      db.prepare('SELECT * FROM founders WHERE company_id = ?').bind(companyId).all<Founder>(),
      db.prepare('SELECT * FROM products WHERE company_id = ?').bind(companyId).all<Product>(),
      db
        .prepare(
          `SELECT pf.* FROM product_features pf
           JOIN products p ON p.id = pf.product_id
           WHERE p.company_id = ?`
        )
        .bind(companyId)
        .all<ProductFeature & { product_id: string }>(),
      db.prepare('SELECT * FROM competitors WHERE company_id = ?').bind(companyId).all<Competitor>(),
      db.prepare('SELECT * FROM pricing_tiers WHERE company_id = ?').bind(companyId).all<PricingTier>(),
      db.prepare('SELECT * FROM review_themes WHERE company_id = ?').bind(companyId).all(),
      db.prepare('SELECT * FROM positioning_notes WHERE company_id = ? ORDER BY created_at DESC').bind(companyId).all(),
      db.prepare('SELECT * FROM field_sources WHERE company_id = ?').bind(companyId).all(),
    ]);

  const featuresByProduct = new Map<string, ProductFeature[]>();
  for (const f of features.results ?? []) {
    const list = featuresByProduct.get(f.product_id) ?? [];
    list.push(f);
    featuresByProduct.set(f.product_id, list);
  }

  return {
    ...company,
    founders: founders.results ?? [],
    products: (products.results ?? []).map((p) => ({ ...p, features: featuresByProduct.get(p.id) ?? [] })),
    competitors: competitors.results ?? [],
    pricing_tiers: pricingTiers.results ?? [],
    review_themes: (reviewThemes.results ?? []) as any,
    positioning_notes: (positioningNotes.results ?? []) as any,
    field_sources: (fieldSources.results ?? []) as any,
  };
}

export async function listCompanies(db: D1Database): Promise<Company[]> {
  const rows = await db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all<Company>();
  return rows.results ?? [];
}

interface CreateDraftInput {
  domain: string;
  websiteUrl: string;
  extracted: ExtractedCompanyData;
  sourceUrl: string;
}

/** Persists a fresh AI-extracted draft. Status is always 'draft' until a human verifies it. */
export async function createDraftCompany(db: D1Database, input: CreateDraftInput): Promise<string> {
  const { domain, websiteUrl, extracted, sourceUrl } = input;
  const companyId = newId();
  const now = new Date().toISOString();

  const statements = [
    db
      .prepare(
        `INSERT INTO companies
         (id, domain, website_url, name, tagline, headline, subheadline, value_proposition, category, icp, about_content, status, last_scanned_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
      )
      .bind(
        companyId,
        domain,
        websiteUrl,
        extracted.name ?? null,
        extracted.tagline ?? null,
        extracted.headline ?? null,
        extracted.subheadline ?? null,
        extracted.value_proposition ?? null,
        extracted.category ?? null,
        extracted.icp ?? null,
        extracted.about_dump ?? null,
        now,
        now,
        now
      ),
  ];

  for (const founder of extracted.founders ?? []) {
    statements.push(
      db
        .prepare('INSERT INTO founders (id, company_id, name, title, linkedin_url) VALUES (?, ?, ?, ?, ?)')
        .bind(newId(), companyId, founder.name, founder.title ?? null, founder.linkedin_url ?? null)
    );
  }

  for (const product of extracted.products ?? []) {
    const productId = newId();
    statements.push(
      db
        .prepare('INSERT INTO products (id, company_id, name, description) VALUES (?, ?, ?, ?)')
        .bind(productId, companyId, product.name, product.description ?? null)
    );
    for (const feature of product.features ?? []) {
      statements.push(
        db
          .prepare('INSERT INTO product_features (id, product_id, name, description) VALUES (?, ?, ?, ?)')
          .bind(newId(), productId, feature.name, feature.description ?? null)
      );
    }
  }

  for (const competitor of extracted.competitors ?? []) {
    statements.push(
      db
        .prepare('INSERT INTO competitors (id, company_id, competitor_name, source) VALUES (?, ?, ?, ?)')
        .bind(newId(), companyId, competitor.competitor_name, competitor.source ?? null)
    );
  }

  for (const tier of extracted.pricing_tiers ?? []) {
    statements.push(
      db
        .prepare('INSERT INTO pricing_tiers (id, company_id, tier_name, price, billing_model, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newId(), companyId, tier.tier_name ?? null, tier.price ?? null, tier.billing_model ?? null, tier.notes ?? null)
    );
  }

  // Field-level provenance: every top-level field came from the same page for a first pass.
  const topLevelFields: (keyof ExtractedCompanyData)[] = [
    'name',
    'tagline',
    'headline',
    'subheadline',
    'value_proposition',
    'category',
    'icp',
  ];
  for (const field of topLevelFields) {
    if (extracted[field]) {
      statements.push(
        db
          .prepare('INSERT INTO field_sources (id, company_id, field_name, source_url, confidence, extracted_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(newId(), companyId, field, sourceUrl, 0.7, now)
      );
    }
  }

  await db.batch(statements);
  return companyId;
}

interface VerifyCompanyInput {
  companyId: string;
  fields: Partial<
    Pick<Company, 'name' | 'tagline' | 'headline' | 'subheadline' | 'value_proposition' | 'category' | 'icp'>
  >;
}

/** Marks a draft as human-verified and applies any corrections made during review. */
export async function verifyCompany(db: D1Database, input: VerifyCompanyInput): Promise<void> {
  const { companyId, fields } = input;
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE companies SET
         name = ?, tagline = ?, headline = ?, subheadline = ?, value_proposition = ?, category = ?, icp = ?,
         status = 'verified', updated_at = ?
       WHERE id = ?`
    )
    .bind(
      fields.name ?? null,
      fields.tagline ?? null,
      fields.headline ?? null,
      fields.subheadline ?? null,
      fields.value_proposition ?? null,
      fields.category ?? null,
      fields.icp ?? null,
      now,
      companyId
    )
    .run();
}

export async function markCompanyVerified(db: D1Database, companyId: string): Promise<void> {
  await db
    .prepare("UPDATE companies SET status = 'verified', updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), companyId)
    .run();
}

export async function touchLastScanned(db: D1Database, companyId: string): Promise<void> {
  await db
    .prepare('UPDATE companies SET last_scanned_at = ?, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), new Date().toISOString(), companyId)
    .run();
}

/** Deletes a company and all of its child rows. */
export async function deleteCompany(db: D1Database, companyId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM product_features WHERE product_id IN (SELECT id FROM products WHERE company_id = ?)').bind(companyId),
    db.prepare('DELETE FROM founders WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM products WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM competitors WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM pricing_tiers WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM field_sources WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM company_mentions WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM companies WHERE id = ?').bind(companyId),
  ]);
}

export interface EditableFields {
  name?: string;
  tagline?: string;
  headline?: string;
  subheadline?: string;
  value_proposition?: string;
  category?: string;
  icp?: string;
  about_content?: string;
}

export async function updateCompanyFields(db: D1Database, companyId: string, f: EditableFields): Promise<void> {
  await db
    .prepare(
      `UPDATE companies SET name = ?, tagline = ?, headline = ?, subheadline = ?, value_proposition = ?,
         category = ?, icp = ?, about_content = ?, updated_at = ? WHERE id = ?`
    )
    .bind(
      f.name || null,
      f.tagline || null,
      f.headline || null,
      f.subheadline || null,
      f.value_proposition || null,
      f.category || null,
      f.icp || null,
      f.about_content || null,
      new Date().toISOString(),
      companyId
    )
    .run();
}

export async function saveReviews(db: D1Database, companyId: string, likes: string, dislikes: string): Promise<void> {
  await db
    .prepare('UPDATE companies SET product_likes = ?, product_dislikes = ?, updated_at = ? WHERE id = ?')
    .bind(likes || null, dislikes || null, new Date().toISOString(), companyId)
    .run();
}

/** Re-applies a fresh extraction to an existing company: overwrites scraped fields and
 *  replaces the scraped child rows. Manual data (reviews, mentions) is left untouched. */
export async function refreshCompany(
  db: D1Database,
  companyId: string,
  extracted: ExtractedCompanyData,
  sourceUrl: string
): Promise<void> {
  const now = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE companies SET name = ?, tagline = ?, headline = ?, subheadline = ?, value_proposition = ?,
           category = ?, icp = ?, about_content = ?, last_scanned_at = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        extracted.name ?? null,
        extracted.tagline ?? null,
        extracted.headline ?? null,
        extracted.subheadline ?? null,
        extracted.value_proposition ?? null,
        extracted.category ?? null,
        extracted.icp ?? null,
        extracted.about_dump ?? null,
        now,
        now,
        companyId
      ),
    db.prepare('DELETE FROM product_features WHERE product_id IN (SELECT id FROM products WHERE company_id = ?)').bind(companyId),
    db.prepare('DELETE FROM founders WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM products WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM competitors WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM pricing_tiers WHERE company_id = ?').bind(companyId),
    db.prepare('DELETE FROM field_sources WHERE company_id = ?').bind(companyId),
  ];

  for (const founder of extracted.founders ?? []) {
    stmts.push(
      db
        .prepare('INSERT INTO founders (id, company_id, name, title, linkedin_url) VALUES (?, ?, ?, ?, ?)')
        .bind(newId(), companyId, founder.name, founder.title ?? null, founder.linkedin_url ?? null)
    );
  }
  for (const product of extracted.products ?? []) {
    const productId = newId();
    stmts.push(
      db.prepare('INSERT INTO products (id, company_id, name, description) VALUES (?, ?, ?, ?)').bind(productId, companyId, product.name, product.description ?? null)
    );
    for (const feature of product.features ?? []) {
      stmts.push(
        db.prepare('INSERT INTO product_features (id, product_id, name, description) VALUES (?, ?, ?, ?)').bind(newId(), productId, feature.name, feature.description ?? null)
      );
    }
  }
  for (const competitor of extracted.competitors ?? []) {
    stmts.push(
      db.prepare('INSERT INTO competitors (id, company_id, competitor_name, source) VALUES (?, ?, ?, ?)').bind(newId(), companyId, competitor.competitor_name, competitor.source ?? null)
    );
  }
  for (const tier of extracted.pricing_tiers ?? []) {
    stmts.push(
      db
        .prepare('INSERT INTO pricing_tiers (id, company_id, tier_name, price, billing_model, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newId(), companyId, tier.tier_name ?? null, tier.price ?? null, tier.billing_model ?? null, tier.notes ?? null)
    );
  }

  const topLevelFields: (keyof ExtractedCompanyData)[] = ['name', 'tagline', 'headline', 'subheadline', 'value_proposition', 'category', 'icp'];
  for (const field of topLevelFields) {
    if (extracted[field]) {
      stmts.push(
        db
          .prepare('INSERT INTO field_sources (id, company_id, field_name, source_url, confidence, extracted_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(newId(), companyId, field, sourceUrl, 0.7, now)
      );
    }
  }

  await db.batch(stmts);
}

// Fields the user can individually clear.
const CLEARABLE_SCALARS: Record<string, string> = {
  name: 'name',
  tagline: 'tagline',
  headline: 'headline',
  subheadline: 'subheadline',
  value_proposition: 'value_proposition',
  category: 'category',
  icp: 'icp',
  about_content: 'about_content',
};

export async function clearCompanyFields(db: D1Database, companyId: string, fields: string[]): Promise<void> {
  const stmts: D1PreparedStatement[] = [];
  const setCols: string[] = [];

  for (const f of fields) {
    if (CLEARABLE_SCALARS[f]) setCols.push(`${CLEARABLE_SCALARS[f]} = NULL`);
    else if (f === 'reviews') setCols.push('product_likes = NULL', 'product_dislikes = NULL');
    else if (f === 'founders') stmts.push(db.prepare('DELETE FROM founders WHERE company_id = ?').bind(companyId));
    else if (f === 'products') {
      stmts.push(db.prepare('DELETE FROM product_features WHERE product_id IN (SELECT id FROM products WHERE company_id = ?)').bind(companyId));
      stmts.push(db.prepare('DELETE FROM products WHERE company_id = ?').bind(companyId));
    } else if (f === 'competitors') stmts.push(db.prepare('DELETE FROM competitors WHERE company_id = ?').bind(companyId));
    else if (f === 'pricing') stmts.push(db.prepare('DELETE FROM pricing_tiers WHERE company_id = ?').bind(companyId));
    else if (f === 'mentions') stmts.push(db.prepare('DELETE FROM company_mentions WHERE company_id = ?').bind(companyId));
  }

  if (setCols.length > 0) {
    stmts.unshift(db.prepare(`UPDATE companies SET ${setCols.join(', ')}, updated_at = ? WHERE id = ?`).bind(new Date().toISOString(), companyId));
  }
  if (stmts.length > 0) await db.batch(stmts);
}
