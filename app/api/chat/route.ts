import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { getGroq } from '@/lib/groq';
import { buildHybridRagContext, retrieveHybridMatches } from '@/lib/hybrid-rag';

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
    topK,
    start,
    end,
  });
  const context = buildHybridRagContext(hybrid.matches);
  const groq = getGroq();
  if (!groq) {
    return NextResponse.json({ error: 'Groq not configured' }, { status: 500 });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.35,
    max_tokens: 1000,
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
