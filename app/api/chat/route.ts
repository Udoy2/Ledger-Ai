import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { AI_LIMITS, AI_MODELS, buildHybridRagContext, clampTopK, getGroq, retrieveHybridMatches } from '@/lib/ai';

function extractiveFallback(context: string) {
  if (!context.trim()) {
    return 'I could not find enough matching signals yet. Load or sync more business data, then ask again.';
  }
  const chunks = context
    .split('\n---\n')
    .slice(0, 3)
    .map((chunk, index) => `Evidence ${index + 1}:\n${chunk}`)
    .join('\n\n');
  return `I found relevant evidence, but the LLM is not configured. Here are the strongest retrieved signals:\n\n${chunks}`;
}

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  const { prompt, start, end, topK = 8 } = body as {
    prompt: string;
    start?: string;
    end?: string;
    topK?: number;
  };

  const hybrid = await retrieveHybridMatches({
    supabase,
    businessId: business.id,
    prompt,
    topK: clampTopK(topK, 8),
    start,
    end,
  });
  const context = buildHybridRagContext(hybrid.matches);
  const groq = getGroq();
  if (!groq) {
    return NextResponse.json({
      answer: extractiveFallback(context),
      sources: hybrid.matches.map((m) => m.id),
      retrieved_count: hybrid.matches.length,
      query_variants: hybrid.query_variants,
      mode: 'extractive_fallback',
    });
  }

  const completion = await groq.chat.completions.create({
    model: AI_MODELS.fast,
    temperature: 0.35,
    max_tokens: AI_LIMITS.chatMaxTokens,
    messages: [
      {
        role: 'system',
        content:
          'You are a business intelligence assistant. Use only the retrieved context chunks. Give clear, actionable answers and reference evidence using chunk numbers.',
      },
      { role: 'user', content: `Question: ${prompt}\n\nRetrieved context:\n${context}` },
    ],
  });

  const answer = completion.choices[0]?.message?.content ?? 'I could not generate a response.';
  return NextResponse.json({
    answer,
    sources: hybrid.matches.map((m) => m.id),
    retrieved_count: hybrid.matches.length,
    query_variants: hybrid.query_variants,
  });
}
