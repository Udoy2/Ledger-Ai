import { createHash } from 'crypto';
import { Groq } from 'groq-sdk';
import { AI_MODELS } from '@/lib/ai-config';

const EMBEDDING_DIM = 384;

function fitDimension(values: number[]): number[] {
  if (values.length === EMBEDDING_DIM) return values;
  if (values.length > EMBEDDING_DIM) return values.slice(0, EMBEDDING_DIM);
  const out = values.slice();
  while (out.length < EMBEDDING_DIM) out.push(0);
  return out;
}

function fallbackEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const h = createHash('sha256').update(`${words[i]}:${i}`).digest();
    for (let j = 0; j < EMBEDDING_DIM; j++) {
      vec[j] += ((h[j % h.length] / 255) * 2 - 1) * 0.05;
    }
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = AI_MODELS.embed;
  if (!apiKey) return fallbackEmbedding(text);

  try {
    const client = new Groq({ apiKey });
    const resp = await client.embeddings.create({
      model,
      input: [text],
    });
    const embedding = resp.data[0]?.embedding as number[] | undefined;
    if (!embedding || embedding.length === 0) return fallbackEmbedding(text);
    return fitDimension(embedding);
  } catch {
    return fallbackEmbedding(text);
  }
}

export function chunkText(text: string, size: number): string[] {
  if (!text || size <= 0) return [];

  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).flatMap((paragraph) => {
    const p = paragraph.trim();
    if (!p) return [];
    if (p.length <= size * 8) return [p];
    return p.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  });

  const chunks: string[] = [];
  const overlapWords = Math.max(20, Math.floor(size * 0.15));
  let current: string[] = [];
  let currentWords = 0;

  for (const piece of paragraphs) {
    const pieceWords = piece.split(/\s+/).length;
    if (currentWords + pieceWords > size && current.length > 0) {
      chunks.push(current.join(' ').trim());
      const overlapSource = current.join(' ').split(/\s+/);
      const overlap = overlapSource.slice(Math.max(0, overlapSource.length - overlapWords)).join(' ');
      current = overlap ? [overlap, piece] : [piece];
      currentWords = current.join(' ').split(/\s+/).length;
      continue;
    }
    current.push(piece);
    currentWords += pieceWords;
  }

  if (current.length > 0) chunks.push(current.join(' ').trim());
  return chunks.filter(Boolean);
}
