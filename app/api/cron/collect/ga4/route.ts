import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runConnectorPipeline } from '@/lib/connectors';
import { ga4Provider } from '@/lib/providers/ga4';

/* ------------------------------------------------------------------ */
/*  Shared runner                                                      */
/* ------------------------------------------------------------------ */

async function runForBusiness(
  supabase: any,
  business: { id: string; google_token?: unknown; ga4_property_id?: string },
) {
  // Deduplicate: Clean up any GA4 signals inserted in the last 12 hours for this business
  // to prevent spam/duplicate cards when syncing multiple times on the same day.
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('signals')
    .delete()
    .eq('business_id', business.id)
    .eq('source', 'google_analytics')
    .gte('collected_at', twelveHoursAgo);

  const result = await runConnectorPipeline({
    supabase,
    business,
    provider: ga4Provider,
    mode: business.google_token ? 'api' : 'demo',
    options: { _supabase: supabase }, // passed through to provider for token refresh
  });

  await supabase.from('integration_runs').upsert(
    {
      business_id: business.id,
      source: 'google_analytics',
      status: 'success',
      last_cursor: JSON.stringify({ ga4_property_id: business.ga4_property_id ?? null }),
      last_success_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,source' },
  );

  return result;
}

/* ------------------------------------------------------------------ */
/*  Manual sync (authed user)                                          */
/* ------------------------------------------------------------------ */

async function handleManualSync() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasGoogleToken = !!business.google_token;
  const hasPropertyId = !!business.ga4_property_id;
  const mode = hasGoogleToken && hasPropertyId ? 'api' : 'demo';

  const result = await runForBusiness(supabase, business);

  return NextResponse.json({
    success: true,
    mode,
    business_id: business.id,
    ...result,
  });
}

/* ------------------------------------------------------------------ */
/*  Cron sync (all connected businesses)                               */
/* ------------------------------------------------------------------ */

async function handleCronSync() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Cron GA sync skipped because SUPABASE_SERVICE_ROLE_KEY is not configured.',
    });
  }

  const supabase = createAdminClient();
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, google_token, ga4_property_id')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let totalCollected = 0;
  let totalInserted = 0;
  let totalChunks = 0;

  for (const business of businesses ?? []) {
    const result = await runForBusiness(supabase, business);
    totalCollected += result.collected;
    totalInserted += result.inserted;
    totalChunks += result.vector_chunks_upserted;
  }

  return NextResponse.json({
    success: true,
    source: 'google_analytics',
    businesses_processed: businesses?.length ?? 0,
    collected: totalCollected,
    inserted: totalInserted,
    vector_chunks_upserted: totalChunks,
  });
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                     */
/* ------------------------------------------------------------------ */

async function handle(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (secret) {
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handleCronSync();
  }

  return handleManualSync();
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
