import { indexSignalInPinecone } from '@/lib/index-signal';
import type { SignalTag } from '@/lib/types';

export type FaqDocInput = {
  title: string;
  content: string;
  url?: string;
};

function topicTokens(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((x) => x.length > 3)
    .slice(0, 3);
}

function docTag(title: string): SignalTag {
  const topics = topicTokens(title);
  return {
    sentiment: 'neutral',
    urgency: 'low',
    topics: topics.length ? topics : ['faq', 'product', 'policy'],
  };
}

function normalizeDocs(input: unknown): FaqDocInput[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => {
      const title = typeof (x as any)?.title === 'string' ? (x as any).title.trim() : '';
      const content = typeof (x as any)?.content === 'string' ? (x as any).content.trim() : '';
      const url = typeof (x as any)?.url === 'string' ? (x as any).url.trim() : '';
      return { title, content, url };
    })
    .filter((d) => d.title && d.content)
    .slice(0, 40);
}

export function parseDocsPayload(payload: unknown) {
  return normalizeDocs(payload);
}

export async function ingestFaqDocs(params: {
  supabase: any;
  businessId: string;
  docs: FaqDocInput[];
}) {
  let inserted = 0;
  let chunks = 0;
  const signalIds: string[] = [];

  for (const doc of params.docs) {
    const tag = docTag(doc.title);
    const rawText = `Document title: ${doc.title}\n\n${doc.content}`;
    const metadata = {
      faq_doc: true,
      doc_title: doc.title,
      doc_url: doc.url || null,
      uploaded_at: new Date().toISOString(),
    };

    const { data, error } = await params.supabase
      .from('signals')
      .insert({
        business_id: params.businessId,
        source: 'website_faq_docs',
        type: 'faq_knowledge_doc',
        raw_text: rawText,
        sentiment: tag.sentiment,
        topics: tag.topics,
        urgency: tag.urgency,
        metadata,
      })
      .select('id')
      .single();
    if (error) continue;

    inserted += 1;
    signalIds.push(data.id);
    chunks += await indexSignalInPinecone({
      businessId: params.businessId,
      source: 'website_faq_docs',
      type: 'faq_knowledge_doc',
      rawText,
      tag,
      metadata: {
        ...metadata,
        signal_id: data.id,
      },
    });
  }

  return { inserted, chunks, signal_ids: signalIds };
}
