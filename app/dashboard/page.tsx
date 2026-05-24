import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, BarChart3, BookText, CheckCircle2, Clock3, LogOut, PlugZap, Radio, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';
import { DashboardActions } from '@/components/DashboardClient';
import { getAuthedBusiness } from '@/lib/auth';
import { demoSignals } from '@/lib/demo';
import { hasSupabaseEnv } from '@/lib/env';
import { fallbackReport } from '@/lib/groq';
import type { AiRun, Memory, Recommendation, Report, Signal, ToolCall } from '@/lib/types';

const RagChat = dynamic(() => import('@/components/RagChat').then((m) => m.RagChat), {
  ssr: false,
  loading: () => <div className="border border-line bg-white p-5 text-sm text-slate-500">Loading chat...</div>,
});

const FaqSetupPanel = dynamic(() => import('@/components/FaqSetupPanel').then((m) => m.FaqSetupPanel), {
  ssr: false,
  loading: () => <div className="border border-line bg-white p-5 text-sm text-slate-500">Loading FAQ setup...</div>,
});

const sourceLabels: Record<string, string> = {
  google_review: 'Google Review',
  facebook_comment: 'Facebook',
  instagram_comment: 'Instagram',
  shopify: 'Shopify',
  support_chat: 'Support Chat',
  google_analytics: 'GA4',
  microsoft_clarity: 'Microsoft Clarity',
  website_faq_agent: 'Website FAQ Agent',
  website_faq_docs: 'FAQ Knowledge Doc',
};

const sourceIcons: Record<string, typeof Star> = {
  google_review: Star,
  facebook_comment: Radio,
  instagram_comment: Radio,
  shopify: ShoppingCart,
  support_chat: AlertTriangle,
  google_analytics: TrendingUp,
  microsoft_clarity: TrendingUp,
  website_faq_agent: PlugZap,
  website_faq_docs: BookText,
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="border border-line bg-white p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function IntegrationCard({ name, status, detail }: { name: string; status: 'ready' | 'soon'; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border border-line bg-white p-4">
      <div>
        <h3 className="font-black text-ink">{name}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${status === 'ready' ? 'bg-emerald-50 text-loop' : 'bg-slate-100 text-slate-500'}`}>
        {status === 'ready' ? 'MVP' : 'Next'}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const liveBackend = hasSupabaseEnv();
  const demoBusiness = {
    id: 'demo-business',
    owner_id: 'demo-owner',
    name: 'Northstar Leather Demo',
    industry: 'e-commerce',
    brand_voice: 'direct, warm, and evidence-backed',
    shopify_domain: null,
    woo_domain: null,
    ga4_property_id: null,
    created_at: new Date().toISOString(),
  };

  let business = demoBusiness;
  let signalList: Signal[] = demoSignals.map((signal, index) => ({
    ...signal,
    id: `demo-signal-${index + 1}`,
    business_id: demoBusiness.id,
    collected_at: new Date(Date.now() - index * 32 * 60 * 1000).toISOString(),
  }));
  let report: Report | null = {
    id: 'demo-report',
    business_id: demoBusiness.id,
    content: fallbackReport(demoBusiness, signalList),
    signal_count: signalList.length,
    generated_at: new Date().toISOString(),
  };
  let recommendations: Recommendation[] = [];
  let latestRun: AiRun | null = null;
  let toolCalls: ToolCall[] = [];
  let memories: Memory[] = [];
  let faqDocsCount = 0;

  if (liveBackend) {
    const { supabase, business: authedBusiness } = await getAuthedBusiness();
    if (!authedBusiness) redirect('/auth/login');
    business = authedBusiness;

    const [{ data: signals }, { data: latestReport }, { data: recs }, { data: run }, { data: mems }, { count: docsCount }] = await Promise.all([
      supabase
        .from('signals')
        .select('*')
        .eq('business_id', business.id)
        .order('collected_at', { ascending: false })
        .limit(20),
      supabase
        .from('reports')
        .select('*')
        .eq('business_id', business.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('recommendations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('ai_runs')
        .select('*')
        .eq('business_id', business.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('memories')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('source', 'website_faq_docs')
        .eq('type', 'faq_knowledge_doc'),
    ]);

    signalList = (signals ?? []) as Signal[];
    report = latestReport as Report | null;
    recommendations = (recs ?? []) as Recommendation[];
    latestRun = (run as AiRun | null) ?? null;
    memories = (mems ?? []) as Memory[];
    faqDocsCount = docsCount ?? 0;

    if (latestRun) {
      const { data } = await supabase
        .from('tool_calls')
        .select('*')
        .eq('ai_run_id', latestRun.id)
        .order('created_at', { ascending: true });
      toolCalls = (data ?? []) as ToolCall[];
    }
  }
  const positive = signalList.filter((signal) => signal.sentiment === 'positive').length;
  const urgent = signalList.filter((signal) => signal.urgency === 'high').length;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-loop text-white">
              <BarChart3 size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-loop">KnowledgeLoop</p>
              <h1 className="text-xl font-black text-ink">{business.name}</h1>
            </div>
          </div>
          <form action={logoutAction}>
            <button disabled={!liveBackend} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <LogOut size={16} />
              {liveBackend ? 'Logout' : 'Demo mode'}
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-loop">Owner command center</p>
              <h2 className="mt-1 text-3xl font-black text-ink">Personalized Business Analyst</h2>
            </div>
            <DashboardActions hasSignals={signalList.length > 0} liveBackend={liveBackend} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Signals" value={signalList.length} detail="Latest customer and behavior records" />
            <Stat label="Positive %" value={`${pct(positive, signalList.length)}%`} detail="Current visible sentiment" />
            <Stat label="Urgent issues" value={urgent} detail="High-priority operational risks" />
            <Stat label="Reports" value={report ? '1+' : 0} detail={report ? 'Latest report ready' : 'Generate first report'} />
          </div>

          <div className="border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-ink">AI Report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {report ? `Generated ${new Date(report.generated_at).toLocaleString()}` : 'Load demo data, then generate your first report.'}
                </p>
              </div>
              <Clock3 className="text-loop" size={22} />
            </div>
            {report ? (
              <div className="prose-report max-w-none">
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="border border-dashed border-line bg-slate-50 p-6 text-center">
                <p className="font-bold text-ink">No report yet</p>
                <p className="mt-2 text-sm text-slate-500">Use the buttons above to load demo signals and generate an AI analysis.</p>
              </div>
            )}
          </div>
          <RagChat />
          <FaqSetupPanel docsCount={faqDocsCount} />

          <div className="border border-line bg-white p-5">
            <h2 className="text-xl font-black text-ink">Recommendations</h2>
            <p className="mt-1 text-sm text-slate-500">Evidence-linked actions generated by the AI CTO run.</p>
            <div className="mt-4 space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-slate-500">Run AI CTO to generate recommendations with evidence IDs.</p>
              ) : (
                recommendations.map((rec) => (
                  <article key={rec.id} className="border border-line bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-ink">{rec.title}</p>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">impact: {rec.impact}</span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">effort: {rec.effort}</span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">confidence: {Math.round(Number(rec.confidence) * 100)}%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{rec.rationale}</p>
                    <p className="mt-2 text-xs text-slate-500">Metric: {rec.metric_to_watch || 'n/a'}</p>
                    <p className="mt-1 text-xs text-slate-500">Next step: {rec.next_step || 'n/a'}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-loop">Evidence drawer</summary>
                      <p className="mt-1 text-xs text-slate-500">{rec.evidence_note || 'No extra note'}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">IDs: {rec.evidence_signal_ids.join(', ') || 'n/a'}</p>
                    </details>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="border border-line bg-white p-5">
            <h2 className="text-xl font-black text-ink">Signal Feed</h2>
            <div className="mt-4 space-y-3">
              {signalList.length === 0 ? (
                <p className="text-sm text-slate-500">No signals yet. The MVP can load demo data immediately, then real collectors can feed this same table.</p>
              ) : (
                signalList.map((signal) => {
                  const Icon = sourceIcons[signal.source] ?? PlugZap;
                  return (
                    <article key={signal.id} className="border border-line bg-slate-50 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700">
                          <Icon size={14} />
                          {sourceLabels[signal.source] ?? signal.source}
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">{signal.sentiment}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${signal.urgency === 'high' ? 'bg-red-50 text-red-700' : signal.urgency === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-loop'}`}>
                          {signal.urgency}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{signal.raw_text}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {signal.topics.map((topic) => (
                          <span key={topic} className="rounded-md bg-white px-2 py-1 text-xs text-slate-500">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="border border-line bg-white p-5">
            <h2 className="text-xl font-black text-ink">Data Health</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Connector freshness and source coverage for your AI analyst.</p>
            <div className="mt-4 space-y-3">
              <IntegrationCard name="Demo Data" status="ready" detail="One-click seed for validating the core loop." />
              <IntegrationCard name="GA4 Test Collector" status="ready" detail="Appends fresh analytics-like signals every sync run (24h schedule supported)." />
              <IntegrationCard name="Clarity Collector" status="ready" detail="Rage clicks, dead clicks, engagement, and top URL friction summaries." />
              <IntegrationCard name="Website FAQ Widget" status="ready" detail="Embeddable JS iframe chat that stores visitor Q/A back into the hive mind." />
              <a
                href="https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api"
                target="_blank"
                rel="noreferrer"
                className="block border border-line bg-slate-50 px-4 py-3 text-sm font-bold text-loop"
              >
                Open Microsoft Clarity API docs
              </a>
              <IntegrationCard name="Shopify / WooCommerce" status="soon" detail="Orders, products, carts, repeat buyers." />
              <IntegrationCard name="Google Reviews" status="soon" detail="Star ratings, praise, complaints, recurring themes." />
              <IntegrationCard name="Facebook / Instagram" status="soon" detail="Comments, objections, engagement patterns." />
              <IntegrationCard name="GA4" status="soon" detail="Traffic sources, pages, bounce rates, funnels." />
            </div>
          </div>

          <div className="border border-line bg-ink p-5 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-300" size={20} />
              <h2 className="font-black">Agent trace + memory</h2>
            </div>
            <div className="mt-4 space-y-3">
              {!latestRun ? (
                <p className="text-sm leading-6 text-slate-300">Run AI CTO to see orchestration steps and saved memory.</p>
              ) : (
                <div className="space-y-3">
                  <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100">
                    Run: {latestRun.status} at {new Date(latestRun.started_at).toLocaleString()}
                  </div>
                  <div className="space-y-2">
                    {toolCalls.map((tc) => (
                      <div key={tc.id} className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                        {tc.step} - {tc.tool_name}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {memories.length === 0 ? (
                      <p className="text-xs text-slate-300">No memory yet.</p>
                    ) : (
                      memories.map((memory) => (
                        <div key={memory.id} className="border border-white/10 bg-white/5 px-3 py-2">
                          <p className="text-xs font-bold text-emerald-300">{memory.key}</p>
                          <p className="text-xs text-slate-200">{memory.value}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
