export type CompanyStatus = 'draft' | 'verified';

export interface Founder {
  id: string;
  name: string;
  title?: string | null;
  linkedin_url?: string | null;
}

export interface ProductFeature {
  id: string;
  name: string;
  description?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  features: ProductFeature[];
}

export interface Competitor {
  id: string;
  competitor_name: string;
  linked_company_id?: string | null;
  source?: string | null;
}

export interface PricingTier {
  id: string;
  tier_name?: string | null;
  price?: string | null;
  billing_model?: string | null;
  notes?: string | null;
}

export interface ReviewTheme {
  id: string;
  source?: string | null;
  theme: string;
  sentiment?: 'praise' | 'complaint' | null;
  excerpt?: string | null;
}

export interface PositioningNote {
  id: string;
  gap_notes?: string | null;
  whitespace_notes?: string | null;
  author?: string | null;
  created_at: string;
}

export interface FieldSource {
  field_name: string;
  source_url?: string | null;
  confidence?: number | null;
  extracted_at: string;
}

export interface Company {
  id: string;
  domain: string;
  website_url: string;
  name?: string | null;
  tagline?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  value_proposition?: string | null;
  category?: string | null;
  icp?: string | null;
  about_content?: string | null;
  product_likes?: string | null;
  product_dislikes?: string | null;
  status: CompanyStatus;
  last_scanned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDossier extends Company {
  founders: Founder[];
  products: Product[];
  competitors: Competitor[];
  pricing_tiers: PricingTier[];
  review_themes: ReviewTheme[];
  positioning_notes: PositioningNote[];
  field_sources: FieldSource[];
}

/** Shape returned by the AI extraction step, before anything is persisted. */
export interface ExtractedCompanyData {
  name?: string;
  tagline?: string;
  headline?: string;
  subheadline?: string;
  value_proposition?: string;
  category?: string;
  icp?: string;
  about_dump?: string;
  founders: Omit<Founder, 'id'>[];
  products: (Omit<Product, 'id' | 'features'> & { features: Omit<ProductFeature, 'id'>[] })[];
  competitors: Omit<Competitor, 'id' | 'linked_company_id'>[];
  pricing_tiers: Omit<PricingTier, 'id'>[];
}
