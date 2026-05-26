import { Pinecone } from "@pinecone-database/pinecone";

type VectorRecord = {
  id: string;
  values: number[];
  metadata: Record<string, any>;
};

function getIndex() {
  const indexName = process.env.PINECONE_INDEX;
  if (!process.env.PINECONE_API_KEY || !indexName) {
    throw new Error('Pinecone is not configured');
  }
  return new Pinecone().Index(indexName);
}

function scopedIndex(namespace?: string) {
  const index = getIndex();
  return namespace ? index.namespace(namespace) : index;
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

