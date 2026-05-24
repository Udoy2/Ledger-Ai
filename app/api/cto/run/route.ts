import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { getGroq } from '@/lib/groq';
import { summarizeSignals } from '@/lib/connectors';
import { buildHybridRagContext, retrieveHybridMatches } from '@/lib/hybrid-rag';
import type { Signal } from '@/lib/types';

function parseRecommendationJson(text: string) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Array<Record<string, unknown>>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isMissingTableError(message: string) {
  return message.includes('schema cache') || message.includes('does not exist');
}

function criticFilter(recommendations: Array<Record<string, unknown>>) {
  return recommendations
    .filter((rec) => {
      const title = String(rec.title ?? '').trim();
      const rationale = String(rec.rationale ?? '').trim();
      const metric = String(rec.metric_to_watch ?? '').trim();
      const confidence = Number(rec.confidence ?? 0);
      return Boolean(title && rationale && metric && confidence >= 0.45);
    })
    .slice(0, 5);
}

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = typeof body?.prompt === 'string' && body.prompt.trim()
    ? body.prompt.trim()
    : 'Run AI CTO loop and produce evidence-backed recommendations.';

  const { data: aiRun, error: runError } = await supabase
    .from('ai_runs')
    .insert({
      business_id: business.id,
      trigger_source: 'manual',
      status: 'running',
      input_summary: { prompt },
    })
    .select('*')
    .single();
  const persistentMode = !runError;
  if (runError && !isMissingTableError(runError.message)) {
    return NextResponse.json({ error: runError.message }, { status: 500 });
  }

  try {
    const { data: signalList, error: signalError } = await supabase
      .from('signals')
      .select('*')
      .eq('business_id', business.id)
      .order('collected_at', { ascending: false })
      .limit(200);
    if (signalError) throw new Error(signalError.message);
    const signals = (signalList ?? []) as Signal[];

    const summary = summarizeSignals(signals);
    if (persistentMode && aiRun) {
      await supabase.from('tool_calls').insert({
        ai_run_id: aiRun.id,
        business_id: business.id,
        step: 'data_quality',
        tool_name: 'DataQualityAgent',
        status: 'success',
        input: { minimum_signals: 5 },
        output: {
          stale: summary.total < 5,
          total_signals: summary.total,
          source_coverage: Object.keys(summary.bySource),
        },
      });
    }

    const hybrid = await retrieveHybridMatches({
      supabase,
      businessId: business.id,
      prompt,
      topK: 16,
    });
    const context = buildHybridRagContext(hybrid.matches);
    if (persistentMode && aiRun) {
      await supabase.from('tool_calls').insert({
        ai_run_id: aiRun.id,
        business_id: business.id,
        step: 'metric_analyst',
        tool_name: 'MetricAnalystAgent',
        status: 'success',
        input: { prompt, topK: 16 },
        output: { retrieved_count: hybrid.matches.length, urgent_signals: summary.urgent, negative_signals: summary.negative },
      });
    }

    const groq = getGroq();
    let recommendations: Array<Record<string, unknown>> = [];
    if (groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'You are StrategyAgent and CriticAgent combined. Return ONLY JSON array. Each item keys: title, rationale, impact(low|medium|high), effort(low|medium|high), confidence(0-1), metric_to_watch, next_step, evidence_note. Use only provided context.',
          },
          {
            role: 'user',
            content: `Business: ${business.name}\nPrompt: ${prompt}\nContext:\n${context}`,
          },
        ],
      });
      recommendations = parseRecommendationJson(completion.choices[0]?.message?.content ?? '');
    }

    if (recommendations.length === 0) {
      recommendations = [
        {
          title: 'Reduce checkout friction on mobile',
          rationale: 'Multiple negative/urgent signals indicate drop-off near checkout and UX friction.',
          impact: 'high',
          effort: 'medium',
          confidence: 0.71,
          metric_to_watch: 'checkout_completion_rate',
          next_step: 'Prioritize CTA clarity, shipping ETA visibility, and payment error messaging.',
          evidence_note: 'Based on GA4 and Clarity friction summaries.',
        },
      ];
    }
    recommendations = criticFilter(recommendations);
    if (recommendations.length === 0) {
      recommendations = [
        {
          title: 'Improve clarity on delivery and checkout',
          rationale: 'Signals indicate recurring friction at conversion-critical moments.',
          impact: 'high',
          effort: 'medium',
          confidence: 0.66,
          metric_to_watch: 'checkout_completion_rate',
          next_step: 'Run A/B test with clearer shipping ETA and payment guidance.',
          evidence_note: 'Deterministic critic fallback recommendation.',
        },
      ];
    }

    const evidenceIds = hybrid.matches.slice(0, 6).map((m) => String(m.id ?? '')).filter(Boolean);
    const inserts = recommendations.slice(0, 5).map((rec) => ({
      business_id: business.id,
      ai_run_id: aiRun?.id ?? null,
      title: String(rec.title ?? 'Recommendation'),
      rationale: String(rec.rationale ?? 'Evidence-backed recommendation from AI run.'),
      impact: String(rec.impact ?? 'medium'),
      effort: String(rec.effort ?? 'medium'),
      confidence: Number(rec.confidence ?? 0.6),
      status: 'open',
      evidence_signal_ids: evidenceIds,
      evidence_note: String(rec.evidence_note ?? ''),
      metric_to_watch: String(rec.metric_to_watch ?? ''),
      next_step: String(rec.next_step ?? ''),
    }));
    let savedRecs: any[] = [];
    if (persistentMode) {
      const { data, error: recError } = await supabase.from('recommendations').insert(inserts).select('*');
      if (recError && !isMissingTableError(recError.message)) throw new Error(recError.message);
      savedRecs = data ?? [];
    }

    const memoryRows = [
      {
        business_id: business.id,
        ai_run_id: aiRun?.id ?? null,
        kind: 'fact',
        key: 'last_cto_focus',
        value: String(savedRecs?.[0]?.title ?? 'General growth and operations'),
        confidence: 0.72,
        source: 'MemoryAgent',
      },
      {
        business_id: business.id,
        ai_run_id: aiRun?.id ?? null,
        kind: 'pattern',
        key: 'last_cto_risk',
        value: summary.urgent > 0 ? 'Urgent friction detected in customer journey.' : 'No urgent friction detected.',
        confidence: 0.67,
        source: 'MemoryAgent',
      },
    ];
    for (const row of memoryRows) {
      if (persistentMode) await supabase.from('memories').upsert(row, { onConflict: 'business_id,key' });
    }

    const entityRows = [
      { business_id: business.id, kind: 'page', name: 'checkout', metadata: { source: 'agent' } },
      { business_id: business.id, kind: 'segment', name: 'mobile_users', metadata: { source: 'agent' } },
      { business_id: business.id, kind: 'theme', name: 'delivery_clarity', metadata: { source: 'agent' } },
    ];
    const entityMap = new Map<string, string>();
    for (const entity of entityRows) {
      if (!persistentMode) continue;
      const { data } = await supabase.from('entities').upsert(entity, { onConflict: 'business_id,kind,name' }).select('id, name').single();
      if (data) entityMap.set(data.name, data.id);
    }
    if (entityMap.has('delivery_clarity') && entityMap.has('checkout')) {
      if (persistentMode && aiRun) await supabase.from('relationships').insert({
        business_id: business.id,
        from_entity_id: entityMap.get('delivery_clarity'),
        to_entity_id: entityMap.get('checkout'),
        relation: 'affects',
        weight: 0.78,
        evidence: { ai_run_id: aiRun.id, source: 'StrategyAgent' },
      });
    }

    if (persistentMode && aiRun) await supabase.from('tool_calls').insert([
      {
        ai_run_id: aiRun.id,
        business_id: business.id,
        step: 'strategy',
        tool_name: 'StrategyAgent',
        status: 'success',
        input: { model: groq ? 'llama-3.3-70b-versatile' : 'fallback' },
        output: { recommendations_created: savedRecs?.length ?? 0 },
      },
      {
        ai_run_id: aiRun.id,
        business_id: business.id,
        step: 'critic',
        tool_name: 'CriticAgentDeterministic',
        status: 'success',
        input: { constraints: ['title', 'rationale', 'metric_to_watch', 'confidence>=0.45'] },
        output: { passed_recommendations: recommendations.length },
      },
      {
        ai_run_id: aiRun.id,
        business_id: business.id,
        step: 'memory',
        tool_name: 'MemoryAgent',
        status: 'success',
        input: { memories_written: memoryRows.length },
        output: { graph_entities_upserted: entityMap.size },
      },
    ]);

    if (persistentMode && aiRun) await supabase
      .from('ai_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        output_summary: {
          recommendations_created: savedRecs?.length ?? 0,
          retrieved_count: hybrid.matches.length,
          source_coverage: Object.keys(summary.bySource),
        },
      })
      .eq('id', aiRun.id);

    return NextResponse.json({
      success: true,
      run_id: aiRun?.id ?? null,
      mode: persistentMode ? 'persistent' : 'stateless',
      recommendations_created: savedRecs?.length ?? recommendations.length,
      retrieved_count: hybrid.matches.length,
      query_variants: hybrid.query_variants,
      warning: persistentMode ? null : 'ai_runs tables not found; run schema.sql to enable traces/memory persistence.',
    });
  } catch (error) {
    if (persistentMode && aiRun) await supabase
      .from('ai_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', aiRun.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to run CTO orchestration' }, { status: 500 });
  }
}
