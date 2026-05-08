export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Urgency = 'low' | 'medium' | 'high';

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  brand_voice: string;
  shopify_domain: string | null;
  woo_domain: string | null;
  ga4_property_id: string | null;
  created_at: string;
};

export type Signal = {
  id: string;
  business_id: string;
  source: string;
  type: string;
  raw_text: string;
  sentiment: Sentiment;
  topics: string[];
  urgency: Urgency;
  metadata: Record<string, unknown>;
  collected_at: string;
};

export type Report = {
  id: string;
  business_id: string;
  content: string;
  signal_count: number;
  generated_at: string;
};

export type SignalTag = {
  sentiment: Sentiment;
  topics: string[];
  urgency: Urgency;
};
