import { indexSignalInPinecone } from '@/lib/ai';
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
  let chunks = 0;
  if (!params.docs.length) return { inserted: 0, chunks: 0, signal_ids: [] };

  const now = new Date().toISOString();
  const prepared = params.docs.map((doc) => {
    const tag = docTag(doc.title);
    const rawText = `Document title: ${doc.title}\n\n${doc.content}`;
    const metadata = {
      faq_doc: true,
      doc_title: doc.title,
      doc_url: doc.url || null,
      uploaded_at: now,
    };
    return { doc, tag, rawText, metadata };
  });

  const { data: insertedRows, error } = await params.supabase
    .from('signals')
    .insert(
      prepared.map(({ rawText, tag, metadata }) => ({
        business_id: params.businessId,
        source: 'website_faq_docs',
        type: 'faq_knowledge_doc',
        raw_text: rawText,
        sentiment: tag.sentiment,
        topics: tag.topics,
        urgency: tag.urgency,
        metadata,
      })),
    )
    .select('id,raw_text,sentiment,topics,urgency,metadata,collected_at');
  if (error) return { inserted: 0, chunks: 0, signal_ids: [] };

  const rows = (insertedRows ?? []) as Array<{
    id: string;
    raw_text: string;
    sentiment: SignalTag['sentiment'];
    topics: string[];
    urgency: SignalTag['urgency'];
    metadata: Record<string, unknown>;
    collected_at: string;
  }>;

  for (let i = 0; i < rows.length; i += 4) {
    const slice = rows.slice(i, i + 4);
    const results = await Promise.all(
      slice.map((row) =>
        indexSignalInPinecone({
          businessId: params.businessId,
          source: 'website_faq_docs',
          type: 'faq_knowledge_doc',
          rawText: row.raw_text,
          tag: {
            sentiment: row.sentiment,
            topics: row.topics,
            urgency: row.urgency,
          },
          metadata: {
            ...(row.metadata ?? {}),
            signal_id: row.id,
          },
          createdAt: row.collected_at,
          signalId: row.id,
        }),
      ),
    );
    chunks += results.reduce((sum, n) => sum + n, 0);
  }

  return { inserted: rows.length, chunks, signal_ids: rows.map((row) => row.id) };
}
