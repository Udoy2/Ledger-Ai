import { createHash } from 'crypto';
import type { Signal } from '@/lib/types';

export function vectorNamespaceForBusiness(businessId: string) {
  return `business-${businessId}`;
}

export function buildChunkId(params: {
  businessId: string;
  source: string;
  type: string;
  checksum: string;
  chunkIndex: number;
}) {
  const { businessId, source, type, checksum, chunkIndex } = params;
  return `${businessId}:${source}:${type}:${checksum}:${chunkIndex}`;
}

export function checksumText(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 20);
}

export function buildRagContext(matches: Array<{ id?: string; metadata?: Record<string, unknown> }>) {
  return matches
    .map((match, i) => {
      const meta = (match.metadata ?? {}) as Record<string, unknown>;
      const topics = Array.isArray(meta.topics) ? meta.topics.join(', ') : '';
      return [
        `Chunk: ${i + 1}`,
        `Vector ID: ${match.id ?? ''}`,
        `Source: ${String(meta.source ?? '')}`,
        `Type: ${String(meta.type ?? '')}`,
        `Sentiment: ${String(meta.sentiment ?? '')}`,
        `Urgency: ${String(meta.urgency ?? '')}`,
        `Topics: ${topics}`,
        `Text: ${String(meta.raw_text ?? '')}`,
      ].join('\n');
    })
    .join('\n---\n');
}

export function signalToIndexableText(signal: Pick<Signal, 'source' | 'type' | 'raw_text' | 'topics' | 'sentiment' | 'urgency'>) {
  const topics = signal.topics.join(', ');
  return `Source: ${signal.source}\nType: ${signal.type}\nSentiment: ${signal.sentiment}\nUrgency: ${signal.urgency}\nTopics: ${topics}\n\n${signal.raw_text}`;
}
