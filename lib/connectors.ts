import { indexSignalInPinecone } from '@/lib/index-signal';
import { tagSignal } from '@/lib/groq';
import type { Signal, SignalTag } from '@/lib/types';

export type ConnectorPayload = {
  source: string;
  type: string;
  raw_text: string;
  metadata?: Record<string, unknown>;
  sentiment?: SignalTag['sentiment'];
  topics?: string[];
  urgency?: SignalTag['urgency'];
};

export type ConnectorProvider = {
  source: string;
  collect: (params: {
    business: { id: string; google_token?: unknown };
    mode?: string;
    options?: Record<string, unknown>;
  }) => Promise<ConnectorPayload[]>;
};

export async function runConnectorPipeline(params: {
  supabase: any;
  business: { id: string; google_token?: unknown };
  provider: ConnectorProvider;
  mode?: string;
  options?: Record<string, unknown>;
}) {
  const collected = await params.provider.collect({ business: params.business, mode: params.mode, options: params.options });
  let inserted = 0;
  let chunks = 0;
  const signalIds: string[] = [];

  for (const row of collected) {
    const tag: SignalTag =
      row.sentiment && row.topics && row.urgency
        ? { sentiment: row.sentiment, topics: row.topics.slice(0, 3), urgency: row.urgency }
        : await tagSignal(row.raw_text);

    const insertPayload = {
      business_id: params.business.id,
      source: row.source,
      type: row.type,
      raw_text: row.raw_text,
      sentiment: tag.sentiment,
      topics: tag.topics,
      urgency: tag.urgency,
      metadata: row.metadata ?? {},
    };
    const { data, error } = await params.supabase.from('signals').insert(insertPayload).select('id').single();
    if (error) continue;

    inserted += 1;
    signalIds.push(data.id);
    chunks += await indexSignalInPinecone({
      businessId: params.business.id,
      source: row.source,
      type: row.type,
      rawText: row.raw_text,
      tag,
      metadata: row.metadata ?? {},
    });
  }

  return {
    source: params.provider.source,
    collected: collected.length,
    inserted,
    vector_chunks_upserted: chunks,
    signal_ids: signalIds,
  };
}

export function summarizeSignals(signals: Signal[]) {
  const bySource = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] ?? 0) + 1;
    return acc;
  }, {});
  const urgent = signals.filter((s) => s.urgency === 'high').length;
  const negative = signals.filter((s) => s.sentiment === 'negative').length;
  return { total: signals.length, bySource, urgent, negative };
}
