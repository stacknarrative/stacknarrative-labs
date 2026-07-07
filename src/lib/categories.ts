// Canonical category taxonomy for filtering. Company `category` text is free-form
// (AI-extracted), so each canonical category matches on keyword patterns.
export const CATEGORIES = [
  'Hotel Management Software',
  'Vacation Rental',
  'Guest Engagement (Guest Communication)',
  'Revenue Management',
  'Operations Platform',
  'Marketing',
  'CRM',
  'Distribution',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

const PATTERNS: Record<Exclude<Category, 'Other'>, RegExp> = {
  'Hotel Management Software': /hotel management|property management|\bpms\b|hotel software|hospitality software|hotel platform/i,
  'Vacation Rental': /vacation rental|short[-\s]?term rental|holiday rental|airbnb|rental management/i,
  'Guest Engagement (Guest Communication)': /guest engagement|guest communicat|guest messag|guest experience|guest app|concierge|messaging/i,
  'Revenue Management': /revenue management|\brms\b|yield management|pricing|rate shopping|rate management/i,
  'Operations Platform': /operations|operational|housekeeping|task management|workforce|maintenance|ops platform/i,
  Marketing: /marketing|advertis|seo|social media|campaign/i,
  CRM: /\bcrm\b|customer relationship|loyalty|guest data platform|cdp/i,
  Distribution: /distribution|channel manager|channel management|booking engine|\bota\b|connectivity|gds/i,
};

/** Does the company's combined text match the given canonical category? */
export function matchesCategory(text: string, canonical: Category): boolean {
  const t = text.toLowerCase();
  if (canonical === 'Other') {
    return !Object.values(PATTERNS).some((re) => re.test(t));
  }
  return PATTERNS[canonical].test(t);
}
