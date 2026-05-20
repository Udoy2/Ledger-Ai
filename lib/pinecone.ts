import { Pinecone } from "@pinecone-database/pinecone";

// Initialise Pinecone client using env vars from .env.local
// The SDK will automatically read PINECONE_API_KEY from environment variables
const pinecone = new Pinecone();

const index = pinecone.Index(process.env.PINECONE_INDEX!);

type VectorRecord = {
  id: string;
  values: number[];
  metadata: Record<string, any>;
};

function scopedIndex(namespace?: string) {
  return namespace ? index.namespace(namespace) : index;
}

/** Upsert a single vector with metadata */
export async function upsertVector(
  id: string,
  values: number[],
  metadata: Record<string, any>,
  namespace?: string
) {
  await scopedIndex(namespace).upsert({
    records: [{ id, values, metadata }],
  });
}

/** Upsert many vectors in batches */
export async function upsertVectors(records: VectorRecord[], namespace?: string) {
  if (records.length === 0) return;
  const client = scopedIndex(namespace);
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    await client.upsert({
      records: records.slice(i, i + batchSize),
    });
  }
}

/** Query similar vectors */
export async function queryVector(
  queryValues: number[],
  topK: number = 5,
  includeMetadata: boolean = true,
  opts?: { namespace?: string; filter?: Record<string, any> }
) {
  const resp = await scopedIndex(opts?.namespace).query({
    vector: queryValues,
    topK,
    includeMetadata,
    filter: opts?.filter,
  });
  return resp.matches;
}

/** Utility to delete all vectors – use only for dev / reset */
export async function deleteAllVectors() {
  await index.deleteAll();
}
