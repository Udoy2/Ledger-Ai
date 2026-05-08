import { PineconeClient } from "@pinecone-database/pinecone";

// Initialise Pinecone client using env vars from .env.local
const pinecone = new PineconeClient();
await pinecone.init({
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENV!, // e.g., "us-east-1-aws"
});

const index = pinecone.Index(process.env.PINECONE_INDEX!);

/** Upsert a single vector with metadata */
export async function upsertVector(
  id: string,
  values: number[],
  metadata: Record<string, any>
) {
  await index.upsert({
    upsertRequest: {
      vectors: [{ id, values, metadata }],
    },
  });
}

/** Query similar vectors */
export async function queryVector(
  queryValues: number[],
  topK: number = 5,
  includeMetadata: boolean = true
) {
  const resp = await index.query({
    queryRequest: {
      vector: queryValues,
      topK,
      includeMetadata,
    },
  });
  return resp.matches;
}

/** Utility to delete all vectors – use only for dev / reset */
export async function deleteAllVectors() {
  await index.deleteAll();
}
