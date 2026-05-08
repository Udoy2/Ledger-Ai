import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { generateInsightReport } from '@/lib/groq';
import type { Signal } from '@/lib/types';

export async function POST() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  let { data: signals, error } = await supabase
    .from('signals')
    .select('*')
    .eq('business_id', business.id)
    .gte('collected_at', since)
    .order('collected_at', { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!signals || signals.length < 5) {
    const fallback = await supabase
      .from('signals')
      .select('*')
      .eq('business_id', business.id)
      .order('collected_at', { ascending: false })
      .limit(40);

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }

    signals = fallback.data;
  }

  if (!signals || signals.length === 0) {
    return NextResponse.json({ error: 'Load demo data or connect an integration before generating a report.' }, { status: 400 });
  }

  const content = await generateInsightReport(business, signals as Signal[]);

  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert({
      business_id: business.id,
      content,
      signal_count: signals.length,
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, report });
}
