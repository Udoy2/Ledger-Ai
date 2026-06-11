import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { deleteNamespace } from '@/lib/pinecone';
import { vectorNamespaceForBusiness } from '@/lib/rag';
import { hasSupabaseEnv } from '@/lib/env';

export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: 'No live backend configured — nothing to clear in demo mode.' },
      { status: 400 },
    );
  }

  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bid = business.id;

  // Delete child tables first (some cascade, but be explicit to avoid FK issues).
  // relationships cascade from entities, tool_calls cascade from ai_runs.
  const tables = [
    'signals',
    'reports',
    'integration_runs',
    'recommendations',
    'memories',
    'relationships',
    'entities',
    'ai_runs',
  ] as const;

  const errors: string[] = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('business_id', bid);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // Wipe all Pinecone vectors for this business namespace
  let pineconeCleared = false;
  try {
    await deleteNamespace(vectorNamespaceForBusiness(bid));
    pineconeCleared = true;
  } catch {
    errors.push('pinecone: namespace delete failed');
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'All data cleared for this workspace.',
    pinecone_cleared: pineconeCleared,
    tables_cleared: tables,
  });
}
