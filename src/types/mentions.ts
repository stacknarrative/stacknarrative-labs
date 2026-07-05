export type MentionCategory = 'press_release' | 'funding' | 'product_news' | 'interview' | 'podcast' | 'other';

export interface Mention {
  id: string;
  url: string;
  title?: string | null;
  category?: MentionCategory | null;
  found_at: string;
}

export interface MentionJob {
  status: 'running' | 'done' | 'error';
  error?: string | null;
  updated_at: string;
}

/** Shape the model records: a flat list of categorized links, no page content. */
export interface ExtractedMention {
  url: string;
  title?: string;
  category?: MentionCategory;
}
