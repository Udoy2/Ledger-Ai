import { redirect } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  BarChart3,
  BookText,
  CheckCircle2,
  Clock3,
  LogOut,
  PlugZap,
  Radio,
  ShoppingCart,
  Star,
  TrendingUp,
  Activity,
  Cpu,
  BrainCircuit,
  Settings,
  Layers,
  Zap,
  Grid,
  HelpCircle,
  FileText,
  Search,
  User,
  Sliders,
} from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';
import { DashboardActions } from '@/components/DashboardClient';
import { LazyDashboardWidgets } from '@/components/LazyDashboardWidgets';
import { getAuthedBusiness } from '@/lib/auth';
import { demoSignals } from '@/lib/demo';
import { hasSupabaseEnv } from '@/lib/env';
import { fallbackReport } from '@/lib/ai';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { AiRun, Memory, Recommendation, Report, Signal, ToolCall } from '@/lib/types';

export const dynamic = 'force-dynamic';

const sourceLabels: Record<string, string> = {
  google_review: 'Google Review',
  facebook_comment: 'Facebook Feedback',
  instagram_comment: 'Instagram Feedback',
  shopify: 'Shopify Store',
  support_chat: 'Support Chat',
  google_analytics: 'Google Analytics 4',
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

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon?: any }) {
  return (
    <div className="glass-stat stat-card p-5 flex flex-col justify-between" style={{ minHeight: '120px' }}>
      <div className="flex justify-between items-start">
        <p className="mono-label text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          {Icon && <Icon size={14} />}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
      </div>
    </div>
  );
}

function IntegrationCard({ name, status, detail, icon: Icon }: { name: string; status: 'ready' | 'soon'; detail: string; icon?: any }) {
  return (
    <div className="glass flex items-start justify-between gap-3 p-3.5 rounded-xl">
      <div className="flex gap-3">
        {Icon && (
          <div className="mt-0.5 p-2 rounded-lg border shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            <Icon size={13} />
          </div>
        )}
        <div>
          <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{name}</h3>
          <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase ${status === 'ready' ? 'badge-positive' : 'badge-neutral'}`}>
        {status === 'ready' ? 'Active' : 'Soon'}
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
        .select('id,business_id,source,type,raw_text,sentiment,topics,urgency,metadata,collected_at')
        .eq('business_id', business.id)
        .order('collected_at', { ascending: false })
        .limit(20),
      supabase
        .from('reports')
        .select('id,business_id,content,signal_count,generated_at')
        .eq('business_id', business.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('recommendations')
        .select('id,business_id,ai_run_id,title,rationale,impact,effort,confidence,status,evidence_signal_ids,evidence_note,metric_to_watch,next_step,created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('ai_runs')
        .select('id,business_id,trigger_source,status,started_at,finished_at,input_summary,output_summary,error_message')
        .eq('business_id', business.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('memories')
        .select('id,business_id,ai_run_id,kind,key,value,confidence,source,created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('signals')
        .select('id', { count: 'exact', head: true })
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
        .select('id,ai_run_id,business_id,step,tool_name,status,input,output,created_at')
        .eq('ai_run_id', latestRun.id)
        .order('created_at', { ascending: true });
      toolCalls = (data ?? []) as ToolCall[];
    }
  }

  const positive = signalList.filter((signal) => signal.sentiment === 'positive').length;
  const urgent = signalList.filter((signal) => signal.urgency === 'high').length;

  return (
    <div className="min-h-screen flex relative" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      
      {/* 1. Left Sidebar Navigation */}
<aside className="glass-sidebar w-64 flex-col justify-between shrink-0 sticky top-0 h-screen z-40 p-6 hidden lg:flex">
          <div className="space-y-8">
          
          {/* Sidebar Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold text-md no-underline hover:opacity-90 transition-opacity" style={{ color: 'var(--text-primary)' }}>
            <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              <BarChart3 size={16} />
            </div>
            <span className="tracking-tight font-extrabold">LedgerAI</span>
          </Link>

          {/* Nav Items */}
          <nav className="space-y-1">
            <p className="mono-label text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-3" style={{ color: 'var(--text-tertiary)' }}>Workspace Menu</p>
            
            <a href="#stats" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs no-underline transition-all"
               style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Grid size={14} />
              <span>Workspace Overview</span>
            </a>
            
            <a href="#report" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs no-underline transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
               style={{ color: 'var(--text-secondary)' }}>
              <FileText size={14} />
              <span>Insight Reports</span>
            </a>
            
            <a href="#actions" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs no-underline transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
               style={{ color: 'var(--text-secondary)' }}>
              <Sliders size={14} />
              <span>Prescriptive Actions</span>
            </a>

            <a href="#signals" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs no-underline transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
               style={{ color: 'var(--text-secondary)' }}>
              <Layers size={14} />
              <span>Telemetry Signals</span>
            </a>
            
            <Link href="/judge/prd" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs no-underline transition-all hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
               style={{ color: 'var(--text-secondary)' }}>
              <HelpCircle size={14} />
              <span>System PRD Summary</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                 style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              <User size={13} />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{business.name}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{business.industry}</p>
            </div>
          </div>
          
          <form action={logoutAction} className="w-full">
            <button
              disabled={!liveBackend}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LogOut size={13} />
              <span>{liveBackend ? 'Sign Out' : 'Demo Mode'}</span>
            </button>
          </form>
        </div>
      </aside>

      {/* 2. Main content area on the right */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Mobile-only top logo bar */}
<div className="lg:hidden flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
  <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-sm no-underline" style={{ color: 'var(--text-primary)' }}>
    <div className="p-1.5 rounded-lg" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
      <BarChart3 size={15} />
    </div>
    <span>LedgerAI</span>
  </Link>
  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full badge-positive">Live</span>
</div>
        
        {/* Sticky Header with Search and Actions */}
<header className="glass-nav sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">          
          {/* Left search bar */}
<div className="relative w-72 max-w-full hidden sm:block">
              <Search className="absolute left-3 top-2.5" size={13} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search insights, metrics, telemetry..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider badge-positive shrink-0 shadow-sm">
              <span className="pulse-dot" />
              Live Feed
            </span>
          </div>
        </header>

        {/* Greeting Section */}
<div className="px-4 sm:px-8 pt-6 sm:pt-8">
            <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-accent-subtle to-transparent pointer-events-none" />
            <div className="flex flex-col gap-5">
              <div>
                <p className="mono-label text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Active Workspace Dashboard</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Welcome back, Owner!</h2>
                <p className="mt-1.5 text-xs max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Here is the store intelligence overview today. Trigger automated GA4, Clarity, or seeder scripts below to keep telemetry fresh.
                </p>
              </div>
             <div className="border-t pt-4 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
  <DashboardActions hasSignals={signalList.length > 0} liveBackend={liveBackend} />
</div>
            </div>
          </div>
        </div>

        {/* Dynamic Grid Sections */}
<div className="px-4 sm:px-8 py-4 sm:py-6 grid gap-6 lg:grid-cols-[1fr_360px] relative z-10">

          {/* Main Workspace Column */}
          <section className="space-y-6">
            
            {/* KPI Stats widgets */}
<div id="stats" className="grid gap-4 grid-cols-2 xl:grid-cols-4 scroll-mt-24">
                <Stat label="Ingested Signals" value={signalList.length} detail="Touchpoints monitored" icon={Layers} />
              <Stat label="Sentiment Ratio" value={`${pct(positive, signalList.length)}%`} detail="Positive customer sentiment" icon={CheckCircle2} />
              <Stat label="Active Risks" value={urgent} detail="High urgency operational traps" icon={AlertTriangle} />
              <Stat label="Generated Reports" value={report ? '1+' : '0'} detail="AI summary sheets ready" icon={BookText} />
            </div>

            {/* AI Report Card */}
            <div id="report" className="glass-card p-6 relative overflow-hidden scroll-mt-24">
              <div className="absolute top-0 right-0 w-40 sm:w-80 h-full bg-gradient-to-l from-accent-subtle to-transparent pointer-events-none"/>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mono-label text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>Synthesis Report</p>
                  <h2 className="text-base font-extrabold tracking-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>Autonomous Executive Analysis</h2>
                  <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {report ? `Generated on ${new Date(report.generated_at).toLocaleString()}` : 'Populate workspace data to analyze.'}
                  </p>
                </div>
                <div className="p-2 rounded-xl border shrink-0" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
                  <Clock3 size={15} />
                </div>
              </div>
              
              {report ? (
                <div className="prose-report p-5 rounded-xl max-h-[480px] overflow-auto max-w-none shadow-inner border"
                     style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                  <ReactMarkdown>{report.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                  <p className="font-bold text-xs" style={{ color: 'var(--text-secondary)' }}>No Active Analysis Sheets</p>
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Click 'Load Demo Data' in the action board, then 'Generate Insight Report'.
                  </p>
                </div>
              )}
            </div>

            {/* AI Agent Chat widget and FAQ widget */}
            <LazyDashboardWidgets docsCount={faqDocsCount} />

            {/* Recommendations Drawer */}
            <div id="actions" className="glass-card p-6 scroll-mt-24">
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit size={15} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Prescriptive Actions</h2>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Action recommendations automatically compiled by the orchestrator run.</p>
              
              <div className="mt-5 space-y-4">
                {recommendations.length === 0 ? (
                  <div className="rounded-xl p-5 text-center text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    ⚡ Click "Run AI CTO" in the command center to trigger the multi-step agent loop and view recommendations.
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <article key={rec.id} className="rounded-xl p-5 border hover:border-accent transition-all" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{rec.title}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded px-2 py-0.5 text-[8px] font-bold uppercase border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Impact: {rec.impact}</span>
                          <span className="rounded px-2 py-0.5 text-[8px] font-bold uppercase border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Effort: {rec.effort}</span>
                          <span className="rounded badge-positive px-2 py-0.5 text-[8px] font-bold">Conf: {pct(Number(rec.confidence), 1)}%</span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.rationale}</p>
                      
                      <div className="mt-4 pt-4 border-t grid gap-3 sm:grid-cols-2 text-[10px] font-semibold" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <span className="block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>METRIC TARGET</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{rec.metric_to_watch || 'Unspecified'}</span>
                        </div>
                        <div>
                          <span className="block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>NEXT STEP</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{rec.next_step || 'Unspecified'}</span>
                        </div>
                      </div>

                      <details className="mt-4 pt-3 border-t group" style={{ borderColor: 'var(--border)' }}>
                        <summary className="cursor-pointer text-[10px] font-bold flex items-center gap-1 select-none" style={{ color: 'var(--accent)' }}>
                          <span>Evidence Drawer</span>
                          <span className="text-[8px] group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-2 p-3 rounded-lg border text-xs space-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                          <p><strong style={{ color: 'var(--text-primary)' }}>Context note:</strong> {rec.evidence_note || 'Linked dataset details.'}</p>
                          <p className="break-all font-mono text-[9px]" style={{ color: 'var(--text-tertiary)' }}><strong style={{ color: 'var(--text-primary)' }}>Evidence ids:</strong> {rec.evidence_signal_ids.join(', ') || 'n/a'}</p>
                        </div>
                      </details>
                    </article>
                  ))
                )}
              </div>
            </div>

            {/* Live Signals Ingestion Feed */}
            <div id="signals" className="glass-card p-6 scroll-mt-24">
              <div className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-2">
                  <Layers size={15} style={{ color: 'var(--accent)' }} className="animate-pulse" />
                  <h2 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Telemetry Signals</h2>
                </div>
                <span className="mono-label text-[9px] px-2.5 py-0.5 rounded-full border font-semibold" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  Active Stream
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Data streams compiled from e-commerce adapters, tagged for categories and urgency on ingestion.</p>
              
              <div className="mt-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {signalList.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    📥 No data streams ingested yet. Load demo data or trigger sync scripts to populate.
                  </div>
                ) : (
                  signalList.map((signal) => {
                    const Icon = sourceIcons[signal.source] ?? PlugZap;
                    const label = sourceLabels[signal.source] ?? signal.source;
                    return (
                      <article key={signal.id} className="signal-card glass rounded-xl p-4 hover:border-accent/40 transition-all">
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] font-bold" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            <Icon size={11} className="text-accent" style={{ color: 'var(--accent)' }} />
                            {label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`badge ${signal.sentiment === 'positive' ? 'badge-positive' : signal.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral'}`}>
                              {signal.sentiment}
                            </span>
                            <span className={`badge ${signal.urgency === 'high' ? 'badge-high' : signal.urgency === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                              {signal.urgency}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{signal.raw_text}</p>
                        {signal.topics && signal.topics.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {signal.topics.map((topic) => (
                              <span key={topic} className="topic-pill">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Right Sidebar Column */}
          <aside className="space-y-6">
            
            {/* Connector Health */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Connector Health</h2>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Schema freshness and connection matrices.</p>
              <div className="mt-4 space-y-2.5">
                <IntegrationCard name="Demo Data Seeder" status="ready" detail="One-click mock dataset injection." icon={Layers} />
                <IntegrationCard name="GA4 telemetry Slot" status="ready" detail="Evaluates bounce metrics, landing traffic, and funnels." icon={TrendingUp} />
                <IntegrationCard name="Clarity Heatmaps" status="ready" detail="Monitors user click friction, scroll layers, and scroll time." icon={TrendingUp} />
                <IntegrationCard name="FAQ Iframe chatbot" status="ready" detail="Self-contained chat frame with automatic memory extraction." icon={PlugZap} />
                <a
                  href="https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center rounded-lg border px-4 py-2 text-xs font-bold no-underline transition-all hover:bg-[var(--bg-overlay)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--accent)', background: 'var(--bg-elevated)' }}
                >
                  Clarity Export API Docs ↗
                </a>
                <IntegrationCard name="Shopify Store Integrator" status="soon" detail="Products collection metrics and repeat basket purchases." icon={ShoppingCart} />
                <IntegrationCard name="Google reviews adapter" status="soon" detail="Aggregates star-ratings, praise, and feedback comments." icon={Star} />
                <IntegrationCard name="Social channels slot" status="soon" detail="Collects Facebook and Instagram comment blocks." icon={Radio} />
              </div>
            </div>

            {/* AI Agent Runner Stack */}
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-subtle rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-1">
                <Settings className="animate-spin" style={{ animationDuration: '8s', color: 'var(--accent)' }} size={14} />
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Orchestration logs</h2>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Step-by-step trace sheets generated by the orchestrator run.</p>
              
              <div className="mt-4 space-y-4">
                {!latestRun ? (
                  <div className="rounded-xl border p-4 text-center text-xs leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)' }}>
                    🤖 Run "AI CTO" to see active agent trace logs and LTM fact boards.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-3 text-xs" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Run status</span>
                        <span className={`uppercase font-bold text-[9px] tracking-wider ${latestRun.status === 'success' ? 'text-accent' : 'text-yellow-600 animate-pulse'}`} style={{ color: latestRun.status === 'success' ? 'var(--accent)' : undefined }}>{latestRun.status}</span>
                      </div>
                      <span className="text-[9px] block" style={{ color: 'var(--text-tertiary)' }}>Trigger: {latestRun.trigger_source} at {new Date(latestRun.started_at).toLocaleTimeString()}</span>
                    </div>
                    
                    {toolCalls && toolCalls.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold block tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Active Trace stack</span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {toolCalls.map((tc) => (
                            <div key={tc.id} className="rounded-lg border p-2 text-[10px] leading-normal flex items-start gap-2" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                              <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                              <div className="truncate">
                                <span className="font-bold block truncate" style={{ color: 'var(--text-primary)' }}>{tc.step}</span>
                                <span className="font-mono text-[8px] block" style={{ color: 'var(--text-tertiary)' }}>tool: {tc.tool_name} • {tc.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {memories && memories.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold block tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Long-Term Facts (LTM)</span>
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                          {memories.map((memory) => (
                            <div key={memory.id} className="rounded-lg border p-3 text-[10px] leading-relaxed" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="font-bold font-mono text-[9px] tracking-tight" style={{ color: 'var(--accent)' }}>{memory.key}</span>
                                <span className="text-[8px] font-bold" style={{ color: 'var(--text-tertiary)' }}>Conf: {pct(Number(memory.confidence), 1)}%</span>
                              </div>
                              <p className="leading-normal" style={{ color: 'var(--text-secondary)' }}>{memory.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>

    
  );
}
