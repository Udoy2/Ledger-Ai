import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { indexSignalInPinecone } from '@/lib/index-signal';
import type { Sentiment, Urgency } from '@/lib/types';

function buildGa4TestSignal(run: number) {
  const visits = 1200 + run * 37;
  const bounce = Math.max(42, 70 - (run % 9));
  const checkoutDrop = Math.max(18, 44 - (run % 11));
  const text = `GA4 daily summary: ${visits} visits in last 24h, ${bounce}% bounce rate on top product page, checkout drop-off ${checkoutDrop}%, and mobile traffic share ${78 + (run % 8)}%.`;
  return {
    source: 'google_analytics',
    type: 'ga4_daily_summary',
    raw_text: text,
    sentiment: 'neutral' as Sentiment,
    topics: ['traffic quality', 'bounce rate', 'checkout funnel'],
    urgency: (bounce > 64 ? 'high' : 'medium') as Urgency,
    metadata: {
      mode: 'test_data',
      visits_24h: visits,
      bounce_rate: bounce,
      checkout_drop_off: checkoutDrop,
    },
  };
}

async function appendSignalForBusiness(
  supabase: any,
  businessId: string,
  run: number,
) {
  const signal = buildGa4TestSignal(run);
  const { error: insertError } = await supabase.from('signals').insert({
    business_id: businessId,
    source: signal.source,
    type: signal.type,
    raw_text: signal.raw_text,
    sentiment: signal.sentiment,
    topics: signal.topics,
    urgency: signal.urgency,
    metadata: signal.metadata,
  });
  if (insertError) return 0;

  return indexSignalInPinecone({
    businessId,
    source: signal.source,
    type: signal.type,
    rawText: signal.raw_text,
    tag: {
      sentiment: signal.sentiment,
      topics: signal.topics,
      urgency: signal.urgency,
    },
    metadata: signal.metadata,
  });
}

async function handleManualSync() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!business.google_token || !business.ga4_property_id) {
    return NextResponse.json(
      {
        error: 'Google Analytics is not connected yet. Connect GA first, then sync.',
        needs_connection: true,
        connect_endpoint: '/api/integrations/ga4/connect',
      },
      { status: 400 },
    );
  }

  const run = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const chunks = await appendSignalForBusiness(supabase, business.id, run);
  return NextResponse.json({
    success: true,
    mode: 'test_data',
    business_id: business.id,
    signals_inserted: 1,
    vector_chunks_upserted: chunks,
  });
}

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
    .select('id')
    .not('google_token', 'is', null)
    .not('ga4_property_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let signalsInserted = 0;
  let chunksUpserted = 0;
  for (let i = 0; i < (businesses ?? []).length; i++) {
    const chunks = await appendSignalForBusiness(
      supabase,
      businesses![i].id,
      Math.floor(Date.now() / (24 * 60 * 60 * 1000)) + i,
    );
    if (chunks > 0) {
      signalsInserted += 1;
      chunksUpserted += chunks;
    }
  }

  return NextResponse.json({
    success: true,
    mode: 'test_data',
    businesses_processed: businesses?.length ?? 0,
    signals_inserted: signalsInserted,
    vector_chunks_upserted: chunksUpserted,
  });
}

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
