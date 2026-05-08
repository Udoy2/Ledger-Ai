import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { tagSignal } from '@/lib/groq';


export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.source || !body?.type || !body?.raw_text) {
    return NextResponse.json({ error: 'source, type, and raw_text are required' }, { status: 400 });
  }

  // 1️⃣ Tag the raw text
  const tag = await tagSignal(String(body.raw_text));

  // 2️⃣ Generate embedding via Groq (384‑dim)
  const { getEmbedding } = await import('@/lib/embeddings');
  const embedding = await getEmbedding(String(body.raw_text));

  // 3️⃣ Upsert vector to Pinecone
  const { upsertVector } = await import('@/lib/pinecone');
  const vectorId = `${body.source}-${Date.now()}`;
  await upsertVector(vectorId, embedding, {
    business_id: business.id,
    source: String(body.source),
    type: String(body.type),
    raw_text: String(body.raw_text),
    sentiment: tag.sentiment,
    topics: tag.topics,
    urgency: tag.urgency,
    metadata: body.metadata ?? {},
  });

  // 4️⃣ Insert normal record into Supabase for relational queries (optional but retained)
  const { data, error } = await supabase
    .from('signals')
    .insert({
      business_id: business.id,
      source: String(body.source),
      type: String(body.type),
      raw_text: String(body.raw_text),
      sentiment: tag.sentiment,
      topics: tag.topics,
      urgency: tag.urgency,
      metadata: body.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, signal: data });
}

  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.source || !body?.type || !body?.raw_text) {
    return NextResponse.json({ error: 'source, type, and raw_text are required' }, { status: 400 });
  }

  const tag = await tagSignal(String(body.raw_text));

  const { data, error } = await supabase
    .from('signals')
    .insert({
      business_id: business.id,
      source: String(body.source),
      type: String(body.type),
      raw_text: String(body.raw_text),
      sentiment: tag.sentiment,
      topics: tag.topics,
      urgency: tag.urgency,
      metadata: body.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, signal: data });
}
