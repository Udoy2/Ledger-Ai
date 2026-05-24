import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { fallbackReport, getGroq } from '@/lib/groq';
import { backfillSignalsToPinecone } from '@/lib/backfill';
import { buildHybridRagContext, retrieveHybridMatches } from '@/lib/hybrid-rag';
import type { Signal } from '@/lib/types';

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reportPrompt =
    typeof body?.prompt === 'string' && body.prompt.trim()
      ? body.prompt.trim()
      : 'Generate a comprehensive report on customer signals, risks, opportunities, and actionable next steps.';
  const start = typeof body?.start === 'string' ? body.start : undefined;
  const end = typeof body?.end === 'string' ? body.end : undefined;

  let hybrid = await retrieveHybridMatches({
    supabase,
    businessId: business.id,
    prompt: reportPrompt,
    topK: 24,
    start,
    end,
  });

  if (!hybrid.matches.length) {
    let existingQuery = supabase
      .from('signals')
      .select('*')
      .eq('business_id', business.id)
      .order('collected_at', { ascending: false })
      .limit(300);
    if (start) existingQuery = existingQuery.gte('collected_at', start);
    if (end) existingQuery = existingQuery.lte('collected_at', end);
    const existingSignals = await existingQuery;

    if (existingSignals.error) {
      return NextResponse.json({ error: existingSignals.error.message }, { status: 500 });
    }
    if (!existingSignals.data || existingSignals.data.length === 0) {
      return NextResponse.json({ error: 'Load demo data or ingest signals before generating a report.' }, { status: 400 });
    }

    await backfillSignalsToPinecone(business.id, existingSignals.data as Signal[]);
    hybrid = await retrieveHybridMatches({
      supabase,
      businessId: business.id,
      prompt: reportPrompt,
      topK: 24,
      start,
      end,
    });

    if (!hybrid.matches.length) {
      const content = fallbackReport(business, existingSignals.data as Signal[]);
      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert({
          business_id: business.id,
          content,
          signal_count: existingSignals.data.length,
        })
        .select('*')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, report, mode: 'fallback' });
    }
  }

  const context = buildHybridRagContext(hybrid.matches);
  const groq = getGroq();
  if (!groq) {
    return NextResponse.json({ error: 'Groq not configured' }, { status: 500 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 1800,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert business intelligence analyst. Use only retrieved context. Return markdown with sections: Executive Summary, #1 Problem, #1 Opportunity, What\'s Working, Action List, Signal Summary. Keep recommendations evidence-backed and practical.',
      },
      {
        role: 'user',
        content: `Business: ${business.name}\nBrand voice: ${business.brand_voice}\n\nRequest: ${reportPrompt}\n\nRetrieved Context:\n${context}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? 'Unable to generate report.';

  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert({
      business_id: business.id,
      content,
      signal_count: hybrid.matches.length,
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    report,
    mode: 'hybrid_rag',
    retrieved_count: hybrid.matches.length,
    query_variants: hybrid.query_variants,
  });
}
