import type {
  Company,
  CompanyDossier,
  ExtractedCompanyData,
  Founder,
  Product,
  ProductFeature,
  MenuItem,
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

  const [founders, products, features, menuItems, competitors, pricingTiers, reviewThemes, positioningNotes, fieldSources] =
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
      db.prepare('SELECT * FROM menu_items WHERE company_id = ? ORDER BY position ASC').bind(companyId).all<MenuItem>(),
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
    menu_items: menuItems.results ?? [],
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
         (id, domain, website_url, name, tagline, headline, subheadline, value_proposition, category, icp, status, last_scanned_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
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

  (extracted.menu_items ?? []).forEach((item, index) => {
    statements.push(
      db
        .prepare('INSERT INTO menu_items (id, company_id, label, url, position) VALUES (?, ?, ?, ?, ?)')
        .bind(newId(), companyId, item.label, item.url ?? null, item.position ?? index)
    );
  });

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

export async function touchLastScanned(db: D1Database, companyId: string): Promise<void> {
  await db
    .prepare('UPDATE companies SET last_scanned_at = ?, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), new Date().toISOString(), companyId)
    .run();
}
