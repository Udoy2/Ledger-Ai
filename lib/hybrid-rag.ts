import { getEmbedding } from '@/lib/embeddings';
import { queryVector } from '@/lib/pinecone';
import { vectorNamespaceForBusiness } from '@/lib/rag';
import type { Signal } from '@/lib/types';

type HybridCandidate = {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  vectorRank?: number;
  keywordRank?: number;
  keywordScore: number;
  vectorScore: number;
  finalScore: number;
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of',
  'on', 'or', 'our', 'that', 'the', 'this', 'to', 'was', 'we', 'what', 'when', 'where', 'which', 'with', 'you',
  'your',
]);

const SYNONYMS: Record<string, string[]> = {
  checkout: ['payment', 'cart', 'funnel'],
  delivery: ['shipping', 'eta', 'dispatch'],
  review: ['rating', 'feedback', 'complaint'],
  conversion: ['purchase', 'order', 'checkout'],
  clarity: ['rage click', 'dead click', 'scroll depth'],
  bounce: ['drop-off', 'exit', 'abandonment'],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

export function rewriteQueryDeterministic(query: string) {
  const tokens = tokenize(query);
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    for (const alt of SYNONYMS[token] ?? []) expanded.add(alt);
  }
  const base = query.trim();
  const keywordExpanded = Array.from(expanded).join(' ');
  const variants = [base, keywordExpanded].filter(Boolean);
  return Array.from(new Set(variants));
}

function scoreKeywordMatch(variants: string[], signal: Pick<Signal, 'source' | 'type' | 'raw_text' | 'topics' | 'urgency'>) {
  const haystack = `${signal.source} ${signal.type} ${signal.raw_text} ${signal.topics.join(' ')}`.toLowerCase();
  const hayTokens = new Set(tokenize(haystack));
  let best = 0;

  for (const variant of variants) {
    const qTokens = tokenize(variant);
    if (qTokens.length === 0) continue;
    let overlap = 0;
    for (const token of qTokens) if (hayTokens.has(token)) overlap += 1;
    const tokenScore = overlap / qTokens.length;
    const phraseBonus = haystack.includes(variant.toLowerCase()) ? 0.2 : 0;
    const topicBonus = signal.topics.some((topic) => variant.toLowerCase().includes(topic.toLowerCase())) ? 0.12 : 0;
    const urgencyBonus = signal.urgency === 'high' ? 0.08 : signal.urgency === 'medium' ? 0.04 : 0;
    best = Math.max(best, Math.min(1, tokenScore + phraseBonus + topicBonus + urgencyBonus));
  }

  return best;
}

function recencyBoost(iso: unknown) {
  const d = typeof iso === 'string' ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return 0;
  const days = Math.max(0, (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(1, 1 - days / 30));
}

function toKey(meta: Record<string, unknown>, fallbackId: string) {
  const signalId = String(meta.signal_id ?? '');
  if (signalId) return `signal:${signalId}`;
  const source = String(meta.source ?? '');
  const type = String(meta.type ?? '');
  const text = String(meta.raw_text ?? '');
  const createdAt = String(meta.created_at ?? '');
  return `${fallbackId}|${source}|${type}|${createdAt}|${text.slice(0, 120)}`;
}

function evidenceId(meta: Record<string, unknown>, fallbackId: string) {
  const signalId = String(meta.signal_id ?? '');
  return signalId ? `signal:${signalId}` : fallbackId;
}

function normalizeVectorScore(match: any, rank: number) {
  const raw = Number(match?.score ?? 0);
  if (Number.isFinite(raw) && raw > 0) return Math.max(0, Math.min(1, raw));
  return 1 / (rank + 1);
}

export function buildHybridRagContext(matches: Array<{ id: string; metadata: Record<string, unknown>; finalScore: number }>) {
  return matches
    .map((match, i) => {
      const meta = match.metadata;
      const topics = Array.isArray(meta.topics) ? meta.topics.join(', ') : '';
      return [
        `Chunk: ${i + 1}`,
        `Evidence ID: ${match.id}`,
        `Source: ${String(meta.source ?? '')}`,
        `Type: ${String(meta.type ?? '')}`,
        `Sentiment: ${String(meta.sentiment ?? '')}`,
        `Urgency: ${String(meta.urgency ?? '')}`,
        `Topics: ${topics}`,
        `Score: ${match.finalScore.toFixed(3)}`,
        `Text: ${String(meta.raw_text ?? '')}`,
      ].join('\n');
    })
    .join('\n---\n');
}

export async function retrieveHybridMatches(params: {
  supabase: any;
  businessId: string;
  prompt: string;
  topK?: number;
  start?: string;
  end?: string;
  sources?: string[];
  types?: string[];
}) {
  const topK = Math.max(4, Math.min(30, params.topK ?? 10));
  const restrictedScope = Boolean(params.sources?.length || params.types?.length);
  const keywordScanLimit = restrictedScope ? 180 : 280;
  const variants = rewriteQueryDeterministic(params.prompt);
  const pool = new Map<string, HybridCandidate>();

  try {
    const queryEmbedding = await getEmbedding(params.prompt);
    const vectorMatches = await queryVector(queryEmbedding, topK * 3, true, {
      namespace: vectorNamespaceForBusiness(params.businessId),
    });
    const ranked = [...(vectorMatches ?? [])];
    ranked.forEach((m: any, index: number) => {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const source = String(meta.source ?? '');
      const type = String(meta.type ?? '');
      if (params.sources?.length && !params.sources.includes(source)) return;
      if (params.types?.length && !params.types.includes(type)) return;
      if (params.start && new Date(String(meta.created_at ?? '')) < new Date(params.start)) return;
      if (params.end && new Date(String(meta.created_at ?? '')) > new Date(params.end)) return;
      const key = toKey(meta, String(m.id ?? `vector-${index}`));
      const existing = pool.get(key);
      const vectorScore = normalizeVectorScore(m, index + 1);
      const keywordScore = scoreKeywordMatch(variants, {
        source: String(meta.source ?? ''),
        type: String(meta.type ?? ''),
        raw_text: String(meta.raw_text ?? ''),
        topics: Array.isArray(meta.topics) ? (meta.topics as string[]) : [],
        urgency: (meta.urgency as Signal['urgency']) ?? 'low',
      });
      const candidate: HybridCandidate = {
        id: evidenceId(meta, String(m.id ?? `vector-${index}`)),
        text: String(meta.raw_text ?? ''),
        metadata: meta,
        vectorRank: index + 1,
        keywordRank: existing?.keywordRank,
        keywordScore: Math.max(existing?.keywordScore ?? 0, keywordScore),
        vectorScore: Math.max(existing?.vectorScore ?? 0, vectorScore),
        finalScore: 0,
      };
      pool.set(key, candidate);
    });
  } catch {
    // Continue with keyword-only retrieval when vectors are unavailable.
  }

  let keywordQuery = params.supabase
    .from('signals')
    .select('id,business_id,source,type,raw_text,sentiment,topics,urgency,metadata,collected_at')
    .eq('business_id', params.businessId)
    .order('collected_at', { ascending: false })
    .limit(keywordScanLimit);
  if (params.sources?.length === 1) keywordQuery = keywordQuery.eq('source', params.sources[0]);
  if (params.types?.length === 1) keywordQuery = keywordQuery.eq('type', params.types[0]);
  if (params.start) keywordQuery = keywordQuery.gte('collected_at', params.start);
  if (params.end) keywordQuery = keywordQuery.lte('collected_at', params.end);
  const { data: keywordRows } = await keywordQuery;

  const scoredKeyword = ((keywordRows ?? []) as Signal[])
    .filter((signal) => (params.sources?.length ? params.sources.includes(signal.source) : true))
    .filter((signal) => (params.types?.length ? params.types.includes(signal.type) : true))
    .map((signal) => ({
      signal,
      score: scoreKeywordMatch(variants, signal),
    }))
    .filter((row) => row.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 3);

  scoredKeyword.forEach(({ signal, score }, index) => {
    const meta: Record<string, unknown> = {
      signal_id: signal.id,
      source: signal.source,
      type: signal.type,
      raw_text: signal.raw_text,
      sentiment: signal.sentiment,
      topics: signal.topics,
      urgency: signal.urgency,
      created_at: signal.collected_at,
      metadata: signal.metadata,
    };
    const key = toKey(meta, `signal:${signal.id}`);
    const existing = pool.get(key);
    const keywordRankScore = 1 / (index + 2);
    const candidate: HybridCandidate = {
      id: existing?.id ?? `signal:${signal.id}`,
      text: signal.raw_text,
      metadata: meta,
      vectorRank: existing?.vectorRank,
      keywordRank: index + 1,
      keywordScore: Math.max(existing?.keywordScore ?? 0, score, keywordRankScore),
      vectorScore: existing?.vectorScore ?? 0,
      finalScore: 0,
    };
    pool.set(key, candidate);
  });

  const reranked = Array.from(pool.values())
    .map((candidate) => {
      const recency = recencyBoost(candidate.metadata.created_at);
      const urgency = String(candidate.metadata.urgency ?? 'low');
      const urgencyBoost = urgency === 'high' ? 0.06 : urgency === 'medium' ? 0.03 : 0;
      const finalScore = candidate.vectorScore * 0.45 + candidate.keywordScore * 0.35 + recency * 0.14 + urgencyBoost;
      return { ...candidate, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);

  return {
    query_variants: variants,
    matches: reranked.map((c) => ({
      id: c.id,
      metadata: c.metadata,
      finalScore: c.finalScore,
      keywordScore: c.keywordScore,
      vectorScore: c.vectorScore,
    })),
  };
}
