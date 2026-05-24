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

export type Recommendation = {
  id: string;
  business_id: string;
  ai_run_id: string | null;
  title: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  confidence: number;
  status: string;
  evidence_signal_ids: string[];
  evidence_note: string | null;
  metric_to_watch: string | null;
  next_step: string | null;
  created_at: string;
};

export type AiRun = {
  id: string;
  business_id: string;
  trigger_source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  error_message: string | null;
};

export type ToolCall = {
  id: string;
  ai_run_id: string;
  business_id: string;
  step: string;
  tool_name: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  created_at: string;
};

export type Memory = {
  id: string;
  business_id: string;
  ai_run_id: string | null;
  kind: string;
  key: string;
  value: string;
  confidence: number;
  source: string;
  created_at: string;
};
