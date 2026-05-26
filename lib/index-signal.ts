import { getEmbedding, chunkText } from '@/lib/embeddings';
import { upsertVectors } from '@/lib/pinecone';
import { buildChunkId, checksumText, signalToIndexableText, vectorNamespaceForBusiness } from '@/lib/rag';
import type { SignalTag } from '@/lib/types';

type IndexSignalInput = {
  businessId: string;
  source: string;
  type: string;
  rawText: string;
  tag: SignalTag;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  signalId?: string;
};

export async function indexSignalInPinecone(input: IndexSignalInput) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const indexableText = signalToIndexableText({
    source: input.source,
    type: input.type,
    raw_text: input.rawText,
    sentiment: input.tag.sentiment,
    topics: input.tag.topics,
    urgency: input.tag.urgency,
  });
  const checksum = checksumText(indexableText);
  const chunks = chunkText(indexableText, 220);
  const namespace = vectorNamespaceForBusiness(input.businessId);
  const records: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk);
    const vectorId = buildChunkId({
      businessId: input.businessId,
      source: input.source,
      type: input.type,
      checksum,
      chunkIndex: i,
    });
    records.push({
      id: vectorId,
      values: embedding,
      metadata: {
        business_id: input.businessId,
        signal_id: input.signalId ?? null,
        source: input.source,
        type: input.type,
        raw_text: chunk,
        sentiment: input.tag.sentiment,
        topics: input.tag.topics,
        urgency: input.tag.urgency,
        created_at: createdAt,
        chunk_index: i,
        total_chunks: chunks.length,
        checksum,
        version: 1,
        ...(input.metadata ?? {}),
      },
    });
  }

  try {
    await upsertVectors(records, namespace);
    return records.length;
  } catch {
    return 0;
  }
}
