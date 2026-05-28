import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { indexSignalInPinecone, tagSignal } from '@/lib/ai';

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.source || !body?.type || !body?.raw_text) {
    return NextResponse.json({ error: 'source, type, and raw_text are required' }, { status: 400 });
  }

  const source = String(body.source);
  const type = String(body.type);
  const rawText = String(body.raw_text);

  const tag = await tagSignal(rawText);
  const { data, error } = await supabase
    .from('signals')
    .insert({
      business_id: business.id,
      source,
      type,
      raw_text: rawText,
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

  const vectorChunksUpserted = await indexSignalInPinecone({
    businessId: business.id,
    source,
    type,
    rawText,
    tag,
    metadata: body.metadata ?? {},
    createdAt: data.collected_at,
    signalId: data.id,
  });

  return NextResponse.json({
    success: true,
    signal: data,
    vector_chunks_upserted: vectorChunksUpserted,
  });
}
