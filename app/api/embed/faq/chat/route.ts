import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { originAllowed, getFaqConfig } from '@/lib/faq-widget';
import { AI_LIMITS, AI_MODELS, buildHybridRagContext, getGroq, indexSignalInPinecone, retrieveHybridMatches } from '@/lib/ai';
import type { SignalTag } from '@/lib/types';

type CachedBusiness = {
  id: string;
  name: string;
  brand_voice: string | null;
  google_token: Record<string, unknown> | null;
  expiresAt: number;
};

const businessCache = new Map<string, CachedBusiness>();
const CACHE_TTL_MS = 1000 * 60 * 5;

function extractTopics(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);
}

function deterministicTag(question: string): SignalTag {
  const q = question.toLowerCase();
  if (q.includes('refund') || q.includes('return') || q.includes('broken') || q.includes('not work')) {
    return { sentiment: 'negative', urgency: 'medium', topics: extractTopics(question) };
  }
  if (q.includes('delivery') || q.includes('shipping') || q.includes('price') || q.includes('payment')) {
    return { sentiment: 'neutral', urgency: 'medium', topics: extractTopics(question) };
  }
  return { sentiment: 'neutral', urgency: 'low', topics: extractTopics(question) };
}

function fallbackAnswer(context: string) {
  const chunks = context.split('\n---\n').slice(0, 2).join('\n---\n');
  if (!chunks.trim()) {
    return 'I can only answer from your uploaded FAQ documents. Please ask the business owner to add product docs, shipping policy, and return policy.';
  }
  return `Based only on uploaded FAQ docs, here is what I found:\n\n${chunks}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : 'anon';
  const pageUrl = typeof body?.page_url === 'string' ? body.page_url.trim() : '';
  if (!key || !message) return NextResponse.json({ error: 'key and message are required' }, { status: 400 });

  const supabase = createAdminClient();
  const now = Date.now();
  let business = businessCache.get(key);
  if (!business || business.expiresAt < now) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id,name,brand_voice,google_token')
      .contains('google_token', { faq_embed_key: key })
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Invalid embed key' }, { status: 401 });
    business = {
      id: data.id,
      name: data.name,
      brand_voice: data.brand_voice,
      google_token: (data.google_token ?? null) as Record<string, unknown> | null,
      expiresAt: now + CACHE_TTL_MS,
    };
    businessCache.set(key, business);
  }

  const cfg = getFaqConfig(business.google_token);
  const origin = request.headers.get('origin');
  if (!originAllowed(origin, cfg.allowedOrigins)) {
    return NextResponse.json({ error: 'Origin not allowed for this embed key' }, { status: 403 });
  }

  const hybrid = await retrieveHybridMatches({
    supabase,
    businessId: business.id,
    prompt: message,
    topK: 8,
    sources: ['website_faq_docs'],
    types: ['faq_knowledge_doc'],
  });
  const context = buildHybridRagContext(hybrid.matches);

  if (!hybrid.matches.length) {
    const answer = fallbackAnswer(context);
    return NextResponse.json({
      success: true,
      answer,
      references: [],
      query_variants: hybrid.query_variants,
      docs_only_mode: true,
    });
  }

  let answer = '';
  const groq = getGroq();
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: AI_MODELS.fast,
        temperature: 0.15,
        max_tokens: AI_LIMITS.faqMaxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You are a customer-facing FAQ assistant. You MUST answer strictly from provided FAQ document context and never invent facts. If context is insufficient, say that you do not have enough uploaded documentation.',
          },
          {
            role: 'user',
            content: `Customer question: ${message}\n\nBusiness context:\n${context}`,
          },
        ],
      });
      answer = completion.choices[0]?.message?.content?.trim() ?? '';
    } catch {
      answer = '';
    }
  }
  if (!answer) answer = fallbackAnswer(context);

  const tag = deterministicTag(message);
  const rawText = `Visitor question: ${message}\nFAQ answer: ${answer}`;
  const metadata = {
    channel: 'website_faq_widget',
    session_id: sessionId,
    page_url: pageUrl,
    query_variants: hybrid.query_variants,
    evidence_ids: hybrid.matches.map((m) => m.id),
    captured_at: new Date().toISOString(),
  };

  const { data: inserted } = await supabase
    .from('signals')
    .insert({
      business_id: business.id,
      source: 'website_faq_agent',
      type: 'faq_conversation',
      raw_text: rawText,
      sentiment: tag.sentiment,
      topics: tag.topics,
      urgency: tag.urgency,
      metadata,
    })
    .select('id')
    .single();

  await indexSignalInPinecone({
    businessId: business.id,
    source: 'website_faq_agent',
    type: 'faq_conversation',
    rawText,
    tag,
    metadata: {
      ...metadata,
      signal_id: inserted?.id ?? null,
      docs_only_mode: true,
    },
    signalId: inserted?.id ?? undefined,
  });

  return NextResponse.json({
    success: true,
    answer,
    references: hybrid.matches.map((m) => m.id),
    query_variants: hybrid.query_variants,
    docs_only_mode: true,
  });
}
