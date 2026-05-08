import { Groq } from 'groq-sdk';

/**
 * Generate a 384‑dimensional embedding for a piece of text using Groq's
 * `llama3-text-embed-v2` model (the free tier supports unlimited calls).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from environment');
  }
  const client = new Groq({ apiKey });
  const resp = await client.embeddings.create({
    model: 'llama3-text-embed-v2', // 384‑dim vector
    input: [text],
  });
  // Groq returns { data: [{ embedding: number[] }] }
  return resp.data[0].embedding as number[];
}
