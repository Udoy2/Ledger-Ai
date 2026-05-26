import { indexSignalInPinecone } from '@/lib/index-signal';
import type { Signal } from '@/lib/types';

export async function backfillSignalsToPinecone(businessId: string, signals: Signal[]) {
  let chunks = 0;
  for (let i = 0; i < signals.length; i += 4) {
    const slice = signals.slice(i, i + 4);
    const results = await Promise.all(
      slice.map((signal) =>
        indexSignalInPinecone({
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
          signalId: signal.id,
        }),
      ),
    );
    chunks += results.reduce((sum, n) => sum + n, 0);
  }
  return chunks;
}
