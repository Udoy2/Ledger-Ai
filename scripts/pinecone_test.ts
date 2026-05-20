import { Pinecone } from "@pinecone-database/pinecone";

async function main() {
  const pc = new Pinecone();
  const index = pc.Index(process.env.PINECONE_INDEX!);

  // 1️⃣ Upsert a test vector (random 384‑dim values)
  const dim = 384; // matches your index dimension (llama-text-embed-v2)
  const vector = Array.from({ length: dim }, () => Math.random());
  const id = `test-${Date.now()}`;
  await index.upsert({
    records: [{ id, values: vector, metadata: { source: "test" } }],
  });
  console.log("✅ Upserted test vector", id);

  // 2️⃣ Query for similar vectors (including the one we just added)
  const queryRes = await index.query({
    vector,
    topK: 3,
    includeMetadata: true,
  });
  console.log("🔎 Query results", queryRes.matches);
}

main().catch((e) => {
  console.error("❌ Error", e);
  process.exit(1);
});
