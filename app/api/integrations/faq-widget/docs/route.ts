import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { ingestFaqDocs, parseDocsPayload } from '@/lib/faq-docs';

export async function GET() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('signals')
    .select('id,raw_text,metadata,collected_at')
    .eq('business_id', business.id)
    .eq('source', 'website_faq_docs')
    .eq('type', 'faq_knowledge_doc')
    .order('collected_at', { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const docs = (data ?? []).map((row: any) => ({
    id: row.id,
    title: String(row?.metadata?.doc_title ?? 'Untitled'),
    url: row?.metadata?.doc_url ?? null,
    collected_at: row.collected_at,
  }));
  return NextResponse.json({ success: true, docs });
}

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const docs = parseDocsPayload(body?.docs);
  if (!docs.length) {
    return NextResponse.json({ error: 'docs is required. Format: [{title, content, url?}]' }, { status: 400 });
  }

  const result = await ingestFaqDocs({
    supabase,
    businessId: business.id,
    docs,
  });
  return NextResponse.json({
    success: true,
    docs_received: docs.length,
    inserted: result.inserted,
    vector_chunks_upserted: result.chunks,
  });
}
