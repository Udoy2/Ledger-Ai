import { indexSignalInPinecone, tagSignal } from '@/lib/ai';
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
  let chunks = 0;
  if (!collected.length) {
    return {
      source: params.provider.source,
      collected: 0,
      inserted: 0,
      vector_chunks_upserted: 0,
      signal_ids: [],
    };
  }

  const prepared = [];
  for (const row of collected) {
    const tag: SignalTag =
      row.sentiment && row.topics && row.urgency
        ? { sentiment: row.sentiment, topics: row.topics.slice(0, 3), urgency: row.urgency }
        : await tagSignal(row.raw_text);
    prepared.push({ row, tag });
  }

  const insertRows = prepared.map(({ row, tag }) => ({
    business_id: params.business.id,
    source: row.source,
    type: row.type,
    raw_text: row.raw_text,
    sentiment: tag.sentiment,
    topics: tag.topics,
    urgency: tag.urgency,
    metadata: row.metadata ?? {},
  }));
  const { data: insertedRows, error } = await params.supabase
    .from('signals')
    .insert(insertRows)
    .select('id,source,type,raw_text,sentiment,topics,urgency,metadata,collected_at');
  if (error) {
    return {
      source: params.provider.source,
      collected: collected.length,
      inserted: 0,
      vector_chunks_upserted: 0,
      signal_ids: [],
    };
  }

  const rows = (insertedRows ?? []) as Array<{
    id: string;
    source: string;
    type: string;
    raw_text: string;
    sentiment: SignalTag['sentiment'];
    topics: string[];
    urgency: SignalTag['urgency'];
    metadata: Record<string, unknown>;
    collected_at: string;
  }>;

  for (let i = 0; i < rows.length; i += 4) {
    const slice = rows.slice(i, i + 4);
    const results = await Promise.all(
      slice.map((row) =>
        indexSignalInPinecone({
          businessId: params.business.id,
          source: row.source,
          type: row.type,
          rawText: row.raw_text,
          tag: {
            sentiment: row.sentiment,
            topics: row.topics,
            urgency: row.urgency,
          },
          metadata: row.metadata ?? {},
          createdAt: row.collected_at,
          signalId: row.id,
        }),
      ),
    );
    chunks += results.reduce((sum, n) => sum + n, 0);
  }

  return {
    source: params.provider.source,
    collected: collected.length,
    inserted: rows.length,
    vector_chunks_upserted: chunks,
    signal_ids: rows.map((row) => row.id),
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
