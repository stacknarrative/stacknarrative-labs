export type Confidence = 'High' | 'Medium' | 'Low';

export type InsightSection =
  | 'philosophy'
  | 'strategic_thinking'
  | 'customer_understanding'
  | 'product_vision'
  | 'market_view'
  | 'language'
  | 'leadership'
  | 'strategic_signal';

export interface FounderInsight {
  section: InsightSection;
  label: string;
  detail?: string;
  evidence?: string;
  source_url?: string;
  confidence?: Confidence;
}

export interface FounderTimelineEntry {
  date?: string;
  event: string;
  source_url?: string;
  why_it_matters?: string;
}

/** Shape returned by the founder-intelligence extraction step. */
export interface FounderIntelligence {
  basic: {
    founder_name?: string;
    co_founders?: string[];
    current_role?: string;
    previous_companies?: string[];
    previous_industries?: string[];
    education?: string;
    years_experience?: string;
    domain_expertise?: string;
  };
  origin: {
    why_started?: string;
    problem_inspired?: string;
    market_gap?: string;
    original_vision?: string;
    current_vision?: string;
    vision_changed?: string;
  };
  insights: FounderInsight[];
  timeline: FounderTimelineEntry[];
  unknowns: string[];
}

export interface FounderProfileRow {
  id: string;
  company_id: string;
  founder_name?: string | null;
  current_role?: string | null;
  education?: string | null;
  years_experience?: string | null;
  domain_expertise?: string | null;
  why_started?: string | null;
  problem_inspired?: string | null;
  market_gap?: string | null;
  original_vision?: string | null;
  current_vision?: string | null;
  vision_changed?: string | null;
  created_at: string;
}

export interface FounderSource {
  id: string;
  url: string;
  title?: string | null;
  fetched_at: string;
}

export interface FounderDossier {
  profile: FounderProfileRow;
  co_founders: string[];
  previous_companies: string[];
  previous_industries: string[];
  insights: (FounderInsight & { id: string })[];
  timeline: (FounderTimelineEntry & { id: string })[];
  unknowns: string[];
  sources: FounderSource[];
}
