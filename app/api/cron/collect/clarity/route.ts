import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runConnectorPipeline } from '@/lib/connectors';
import { clarityProvider } from '@/lib/providers/clarity';

type PullOptions = {
  numOfDays: number;
  dimension1: string;
};

function clampOptions(input: Partial<PullOptions>): PullOptions {
  return {
    numOfDays: Math.max(1, Math.min(3, Number(input.numOfDays ?? 1))),
    dimension1: String(input.dimension1 ?? 'URL'),
  };
}

async function runForBusiness(supabase: any, business: { id: string; google_token?: unknown }, options: PullOptions) {
  const result = await runConnectorPipeline({
    supabase,
    business,
    provider: clarityProvider,
    mode: business.google_token ? 'api' : 'demo',
    options,
  });
  await supabase.from('integration_runs').upsert(
    {
      business_id: business.id,
      source: 'microsoft_clarity',
      status: 'success',
      last_cursor: JSON.stringify(options),
      last_success_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,source' },
  );
  return result;
}

async function handleManual(options: PullOptions) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runForBusiness(supabase, business, options);
    return NextResponse.json({ success: true, mode: business.google_token ? 'api' : 'demo', options, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clarity sync failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function handleCron(options: PullOptions) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Clarity sync skipped because admin supabase env vars are missing.',
    });
  }

  const supabase = createAdminClient();
  const { data: businesses, error } = await supabase.from('businesses').select('id, google_token').order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let inserted = 0;
  let collected = 0;
  let chunks = 0;
  for (const business of businesses ?? []) {
    const result = await runForBusiness(supabase, business, options);
    inserted += result.inserted;
    collected += result.collected;
    chunks += result.vector_chunks_upserted;
  }

  return NextResponse.json({
    success: true,
    mode: 'demo',
    source: 'microsoft_clarity',
    options,
    businesses_processed: businesses?.length ?? 0,
    collected,
    inserted,
    vector_chunks_upserted: chunks,
  });
}

async function parsePullOptions(request: Request) {
  const url = new URL(request.url);
  const body: any = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  return clampOptions({
    numOfDays: Number(body?.numOfDays ?? url.searchParams.get('numOfDays') ?? 1),
    dimension1: String(body?.dimension1 ?? url.searchParams.get('dimension1') ?? 'URL'),
  });
}

async function handle(request: Request) {
  const options = await parsePullOptions(request);
  const secret = request.headers.get('x-cron-secret');
  if (secret) {
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handleCron(options);
  }
  return handleManual(options);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
