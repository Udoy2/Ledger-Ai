'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  DatabaseZap,
  LineChart,
  PlugZap,
  Radar,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

const connectors = [
  'Shopify',
  'WooCommerce',
  'GA4',
  'Meta Ads',
  'Instagram',
  'Google Reviews',
  'Clarity',
  'Support Chat',
  'TikTok Shop',
  'Klaviyo',
];

const terminalInsights = [
  {
    label: 'Critical',
    text: 'Shipping friction: 48% checkout exits.',
    tone: 'danger',
  },
  {
    label: 'Opportunity',
    text: 'Forest Green demand is 2.4x above stock.',
    tone: 'success',
  },
  {
    label: 'Action',
    text: 'Run threshold test and restock campaign.',
    tone: 'info',
  },
];

const steps = [
  {
    icon: PlugZap,
    title: 'Connect signals',
    text: 'Plug in store, analytics, reviews, social comments, heatmaps, and support streams.',
  },
  {
    icon: DatabaseZap,
    title: 'Normalize context',
    text: 'LedgerAI turns noisy events into scoped customer, revenue, and urgency signals.',
  },
  {
    icon: Bot,
    title: 'Detect patterns',
    text: 'AI clusters topics, tags sentiment, and connects weak signals across channels.',
  },
  {
    icon: Zap,
    title: 'Act faster',
    text: 'Get plain-English priorities, owner-ready reports, and an AI chat over your business.',
  },
];

const stats = [
  { value: '17', label: 'live signals' },
  { value: '3', label: 'urgent plays' },
  { value: '72h', label: 'report cycle' },
];

type AuthStatus = 'checking' | 'guest' | 'authed';

export default function HomePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (entry.isIntersecting) {
            setVisibleSteps((current) => (
              current.includes(index) ? current : [...current, index]
            ));
          }
        });
      },
      { rootMargin: '-10% 0px -15% 0px', threshold: 0.35 },
    );

    stepRefs.current.forEach((step) => {
      if (step) observer.observe(step);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setAuthStatus('guest');
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setAuthStatus(data.session ? 'authed' : 'guest');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? 'authed' : 'guest');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (!hasSupabaseEnv()) return;

    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthStatus('guest');
    setIsLoggingOut(false);
    router.refresh();
  }

  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#050807] text-white">
      <nav className={`landing-nav fixed left-0 right-0 top-0 z-50 ${isScrolled ? 'landing-nav-scrolled' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.25)]">
              <BarChart3 size={17} />
            </span>
            <span className="text-base font-extrabold tracking-tight text-white">LedgerAI</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {authStatus === 'checking' ? (
              <span className="h-10 w-28 rounded-lg border border-white/[0.08] bg-white/[0.04]" aria-hidden="true" />
            ) : authStatus === 'authed' ? (
              <>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white/[0.68] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
                <Link
                  href="/dashboard"
                  className="landing-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#02130d] no-underline"
                >
                  Dashboard <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white/[0.68] no-underline transition hover:text-white sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="landing-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#02130d] no-underline"
                >
                  Start free <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="landing-hero relative flex min-h-screen items-center pt-24">
        <div className="landing-grid-bg" />
        <div className="landing-beams" />
        <div className="landing-hero-glow" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(440px,480px)] lg:pb-20">
          <div className="max-w-4xl">

            <h1 className="landing-headline font-mono text-[clamp(2.75rem,5.8vw,4.8rem)] font-black leading-[0.96] text-white">
              <span className="landing-typewriter">Your store data</span>
              <span className="mt-2 block">finally <span className="landing-unified">unified.</span></span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-white/[0.68] sm:text-lg">
              LedgerAI connects Shopify, reviews, social comments, support, and GA4 into one owner-ready intelligence feed, then tells you what to fix first.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signup"
                className="landing-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-[#02130d] no-underline"
              >
                Create free workspace <ArrowRight size={16} />
              </Link>
              <Link
                href="/pitch"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/[0.82] no-underline backdrop-blur transition hover:border-emerald-300/[0.35] hover:text-white"
              >
                View pitch deck <LineChart size={16} />
              </Link>
            </div>
          </div>

          <div className="landing-terminal relative">
            <div className="landing-terminal-top">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/90" />
                <span className="h-3 w-3 rounded-full bg-yellow-300/90" />
                <span className="h-3 w-3 rounded-full bg-emerald-300/90" />
              </div>
              <span className="font-mono text-xs text-emerald-200/70">ledger-ai/live-insights</span>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.04] px-4 py-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-200/60">Pulse status</p>
                  <p className="mt-1 text-sm font-bold text-white">AI revenue analyst online</p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-[11px] text-emerald-200">
                  <span className="landing-status-dot" />
                  synced
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
                    <p className="font-mono text-2xl font-black text-white">{stat.value}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/[0.45]">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {terminalInsights.map((insight, index) => (
                  <div
                    key={insight.label}
                    className="landing-insight-line rounded-lg border border-white/[0.08] bg-black/[0.35] p-4"
                    style={{ ['--line-index' as string]: index }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`landing-pill landing-pill-${insight.tone}`} />
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/[0.45]">{insight.label}</span>
                    </div>
                    <p className="landing-typed-text font-mono text-sm leading-6 text-emerald-50/90">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/[0.08] bg-black/30 py-6">
        <div className="landing-marquee">
          <div className="landing-marquee-track">
            {[...connectors, ...connectors].map((connector, index) => (
              <span key={`${connector}-${index}`} className="landing-logo-pill">
                <Radar size={14} />
                {connector}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/80">How it works</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            From scattered signals to one decisive next move.
          </h2>
        </div>

        <div className="landing-steps relative grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              ref={(node) => { stepRefs.current[index] = node; }}
              data-step-index={index}
              className={`landing-step ${visibleSteps.includes(index) ? 'landing-step-visible' : ''}`}
              style={{ ['--step-index' as string]: index }}
            >
              <div className="landing-step-icon">
                <step.icon size={20} />
              </div>
              <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/[0.65]">
                Step 0{index + 1}
              </p>
              <h3 className="mt-3 text-xl font-extrabold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/[0.58]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-4 py-12 sm:px-6">
        <div className="landing-cta relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-emerald-300/[0.18] px-6 py-14 text-center sm:px-10">
          <div className="landing-cta-glow" />
          <div className="relative z-10 mx-auto max-w-2xl">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/10 text-emerald-200">
              <CheckCircle2 size={22} />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Start for free.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/[0.62] sm:text-base">
              Launch the workspace, connect the signals you have, and let LedgerAI surface the revenue patterns hiding in plain sight.
            </p>
            <Link
              href="/auth/signup"
              className="landing-button landing-button-large mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-extrabold text-[#02130d] no-underline"
            >
              Build my command center <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-sm text-white/[0.48] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-white no-underline">
          <BarChart3 size={17} className="text-emerald-300" />
          LedgerAI
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link href="/auth/login" className="text-white/[0.48] no-underline transition hover:text-white">Log in</Link>
          <Link href="/auth/signup" className="text-white/[0.48] no-underline transition hover:text-white">Start free</Link>
          <Link href="/pitch" className="text-white/[0.48] no-underline transition hover:text-white">Pitch</Link>
          <Link href="/dashboard" className="text-white/[0.48] no-underline transition hover:text-white">Dashboard</Link>
        </div>
      </footer>
    </main>
  );
}
