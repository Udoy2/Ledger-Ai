import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, LogOut, PlugZap, Radio, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';
import { DashboardActions } from '@/components/DashboardClient';
import { RagChat } from '@/components/RagChat';
import { getAuthedBusiness } from '@/lib/auth';
import { demoSignals } from '@/lib/demo';
import { hasSupabaseEnv } from '@/lib/env';
import { fallbackReport } from '@/lib/groq';
import type { Report, Signal } from '@/lib/types';

const sourceLabels: Record<string, string> = {
  google_review: 'Google Review',
  facebook_comment: 'Facebook',
  instagram_comment: 'Instagram',
  shopify: 'Shopify',
  support_chat: 'Support Chat',
  google_analytics: 'GA4',
};

const sourceIcons: Record<string, typeof Star> = {
  google_review: Star,
  facebook_comment: Radio,
  instagram_comment: Radio,
  shopify: ShoppingCart,
  support_chat: AlertTriangle,
  google_analytics: TrendingUp,
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

  if (liveBackend) {
    const { supabase, business: authedBusiness } = await getAuthedBusiness();
    if (!authedBusiness) redirect('/auth/login');
    business = authedBusiness;

    const [{ data: signals }, { data: latestReport }] = await Promise.all([
      supabase
        .from('signals')
        .select('*')
        .eq('business_id', business.id)
        .order('collected_at', { ascending: false })
        .limit(30),
      supabase
        .from('reports')
        .select('*')
        .eq('business_id', business.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    signalList = (signals ?? []) as Signal[];
    report = latestReport as Report | null;
  }
  const positive = signalList.filter((signal) => signal.sentiment === 'positive').length;
  const urgent = signalList.filter((signal) => signal.urgency === 'high').length;
  const topTopics = Object.entries(
    signalList.flatMap((signal) => signal.topics).reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
              <h2 className="mt-1 text-3xl font-black text-ink">Your latest business read</h2>
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
            <h2 className="text-xl font-black text-ink">Integrations</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">The MVP data layer is ready. OAuth collectors are represented as connection slots and cron endpoints.</p>
            <div className="mt-4 space-y-3">
              <IntegrationCard name="Demo Data" status="ready" detail="One-click seed for validating the core loop." />
              <IntegrationCard name="GA4 Test Collector" status="ready" detail="Appends fresh analytics-like signals every sync run (24h schedule supported)." />
              <IntegrationCard name="Shopify / WooCommerce" status="soon" detail="Orders, products, carts, repeat buyers." />
              <IntegrationCard name="Google Reviews" status="soon" detail="Star ratings, praise, complaints, recurring themes." />
              <IntegrationCard name="Facebook / Instagram" status="soon" detail="Comments, objections, engagement patterns." />
              <IntegrationCard name="GA4" status="soon" detail="Traffic sources, pages, bounce rates, funnels." />
            </div>
          </div>

          <div className="border border-line bg-ink p-5 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-300" size={20} />
              <h2 className="font-black">Recurring themes</h2>
            </div>
            <div className="mt-4 space-y-2">
              {topTopics.length === 0 ? (
                <p className="text-sm leading-6 text-slate-300">Themes appear after signals are collected.</p>
              ) : (
                topTopics.map(([topic, count]) => (
                  <div key={topic} className="flex items-center justify-between gap-3 border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-sm text-slate-100">{topic}</span>
                    <span className="text-sm font-black text-emerald-300">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
