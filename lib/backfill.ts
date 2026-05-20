import { indexSignalInPinecone } from '@/lib/index-signal';
import type { Signal } from '@/lib/types';

export async function backfillSignalsToPinecone(businessId: string, signals: Signal[]) {
  let chunks = 0;
  for (const signal of signals) {
    chunks += await indexSignalInPinecone({
      businessId,
      source: signal.source,
      type: signal.type,
      rawText: signal.raw_text,
      tag: {
        sentiment: signal.sentiment,
        topics: signal.topics,
        urgency: signal.urgency,
      },
      metadata: signal.metadata ?? {},
      createdAt: signal.collected_at,
    });
  }
  return chunks;
}
