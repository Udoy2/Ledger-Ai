import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { generateFaqEmbedKey, getFaqConfig } from '@/lib/faq-widget';
import { ingestFaqDocs, parseDocsPayload } from '@/lib/faq-docs';

function normalizeOrigins(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const allowedOrigins = normalizeOrigins(body?.allowed_origins);
  const docs = parseDocsPayload(body?.docs);
  const prev = (business.google_token ?? {}) as Record<string, unknown>;
  const prevCfg = getFaqConfig(prev);
  const embedKey = prevCfg.embedKey || generateFaqEmbedKey();
  const next = {
    ...prev,
    faq_embed_key: embedKey,
    faq_allowed_origins: allowedOrigins,
    faq_connected_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('businesses').update({ google_token: next }).eq('id', business.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = new URL(request.url).origin;
  const snippet = `<script async src="${origin}/api/embed/widget.js?key=${embedKey}"></script>`;
  const docIngestResult = docs.length
    ? await ingestFaqDocs({
        supabase,
        businessId: business.id,
        docs,
      })
    : null;
  return NextResponse.json({
    success: true,
    embed_key: embedKey,
    allowed_origins: allowedOrigins,
    script_src: `${origin}/api/embed/widget.js?key=${embedKey}`,
    snippet,
    docs_uploaded: docIngestResult?.inserted ?? 0,
    vector_chunks_upserted: docIngestResult?.chunks ?? 0,
  });
}
