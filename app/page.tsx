import Link from 'next/link';
import {
  ArrowRight, BarChart3, Bell,
  MessageSquareText, PlugZap,
  ShoppingBag, Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const sources = [
  'Shopify / WooCommerce', 'Google Reviews', 'Facebook + Instagram',
  'GA4 Analytics', 'Support chats', 'Clarity heatmaps',
];

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)', position: 'relative' }}>

      {/* Nav — glass */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-lg no-underline"
          style={{ color: 'var(--text-primary)' }}>
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-hover)' }}
          >
            <BarChart3 size={16} />
          </span>
          LedgerAI
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/auth/login"
            className="px-3.5 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Log in
          </Link>
          <Link href="/auth/signup"
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
          >
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-14 items-center relative z-10">
        <div className="space-y-6">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid var(--border)' }}
          >
            <Sparkles size={12} /> AI-powered e-commerce intelligence
          </span>

          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Your store data,{' '}
            <span style={{ color: 'var(--accent)' }}>finally unified.</span>
          </h1>

          <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            LedgerAI connects your Shopify store, customer reviews, social comments, and GA4 analytics into one intelligent hub — then surfaces the actions that actually move revenue.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/auth/signup"
              className="btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
            >
              Create free workspace <ArrowRight size={15} />
            </Link>
            <Link href="/auth/login"
              className="btn-secondary inline-flex items-center px-5 py-3 rounded-xl text-sm font-semibold"
            >
              Open dashboard
            </Link>
            <Link href="/pitch"
              className="btn-secondary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
            >
              View pitch deck <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Preview card — glass */}
        <div className="glass-card p-6 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="mono-label text-xs font-semibold" style={{ color: 'var(--accent-text)' }}>
                Live insight preview
              </p>
              <h2 className="text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                What the owner sees
              </h2>
            </div>
            <div
              className="p-2 rounded-lg"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              <Sparkles size={14} className="animate-pulse" />
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'var(--red-subtle)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderLeft: '3px solid var(--red)',
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--red)' }}>Critical pattern</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Shipping cost friction is driving 48% checkout drop-off. Confirmed across Clarity rage clicks, support tickets, and GA4 funnel data.
            </p>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderLeft: '3px solid var(--accent)',
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--accent-text)' }}>Revenue opportunity</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Forest Green demand is outpacing Black 2.4×. Open pre-orders now while social intent is at peak.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '17', label: 'Signals' },
              { value: '3', label: 'Urgent', color: 'var(--red)' },
              { value: '72h', label: 'Cycle', color: 'var(--accent)' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold" style={{ color: s.color ?? 'var(--text-primary)' }}>
                  {s.value}
                </p>
                <p className="text-[10px] font-semibold mt-0.5 mono-label" style={{ color: 'var(--text-tertiary)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid — glass cards */}
      <section className="relative z-10" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: PlugZap,           title: 'Connect',  text: 'OAuth-ready slots for your store, reviews, social, analytics, and chat data.' },
            { icon: ShoppingBag,       title: 'Collect',  text: 'Automated workers normalize all signals — orders, carts, comments, sessions.' },
            { icon: MessageSquareText, title: 'Analyze',  text: 'AI tags sentiment, topic, and urgency. Pattern detection across all sources.' },
            { icon: Bell,              title: 'Act',      text: 'Plain-English reports, insight feeds, and AI-generated action lists.' },
          ].map((f) => (
            <div key={f.title} className="glass-card p-5 space-y-4">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                <f.icon size={17} />
              </span>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Source chips — glass pill bar */}
      <section className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="glass flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl">
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Active connectors</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Data adapters live on the platform</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
