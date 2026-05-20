import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { demoSignals } from '@/lib/demo';
import { backfillSignalsToPinecone } from '@/lib/backfill';
import type { Signal } from '@/lib/types';

export async function POST() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  let inserted = 0;
  if ((count ?? 0) === 0) {
    const { data, error } = await supabase
      .from('signals')
      .insert(demoSignals.map((signal) => ({ ...signal, business_id: business.id })))
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted = data?.length ?? 0;
  }

  // Always backfill to Pinecone so "already loaded" demo rows are still embedded.
  const { data: signals, error: fetchError } = await supabase
    .from('signals')
    .select('*')
    .eq('business_id', business.id)
    .order('collected_at', { ascending: false })
    .limit(300);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const vectorChunkCount = await backfillSignalsToPinecone(business.id, (signals ?? []) as Signal[]);

  return NextResponse.json({
    success: true,
    inserted,
    vector_chunks_upserted: vectorChunkCount,
    message: inserted > 0 ? 'Demo data loaded and embedded.' : 'Demo data already existed; embeddings refreshed.',
  });
}
