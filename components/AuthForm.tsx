import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

type AuthFormProps = {
  mode: 'signup' | 'login';
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthForm({ mode, action, error }: AuthFormProps) {
  const isSignup = mode === 'signup';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative' }}>
      
      <div
        className="glass-card w-full relative z-10"
        style={{
          maxWidth: '960px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          overflow: 'hidden',
        }}
      >
        {/* Left — branding panel */}
        <div
          className="glass-sidebar"
          style={{
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '2rem',
            borderRight: '1px solid var(--border)',
            borderRadius: 0,
          }}
        >
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--text-primary)' }}>
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-hover)' }}
              >
                <BarChart3 size={15} />
              </span>
              <span className="font-extrabold text-sm">LedgerAI</span>
            </Link>
            <ThemeToggle />
          </div>

          <div style={{ flex: 1 }}>
            <p className="mono-label text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-text)' }}>
              AI business intelligence
            </p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Connect once.<br />Get the next best move.
            </h1>
            <p className="text-sm leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
              LedgerAI turns reviews, comments, carts, support chats, and analytics into one plain-English insight feed.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              'Google, Shopify, social, chat, analytics',
              'AI-tagged sentiment, topics, urgency',
              'Executive reports and action lists',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 size={13} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form panel */}
        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <form action={action} className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {isSignup ? 'Create workspace' : 'Welcome back'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {isSignup ? 'Set up your business analytics workspace.' : 'Log in to your intelligence dashboard.'}
              </p>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--red-subtle)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}
              >
                ⚠ {error}
              </div>
            )}

            {isSignup && (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Business name</span>
                <input name="businessName" required placeholder="e.g. Northstar Leather" className="w-full px-3.5 py-2.5 rounded-xl text-sm" />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Email</span>
              <input name="email" type="email" required placeholder="owner@example.com" className="w-full px-3.5 py-2.5 rounded-xl text-sm" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Password</span>
              <input name="password" type="password" required minLength={6} placeholder="At least 6 characters" className="w-full px-3.5 py-2.5 rounded-xl text-sm" />
            </label>

            <button className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold">
              {isSignup ? 'Create workspace' : 'Log in'}
              <ArrowRight size={14} />
            </button>

            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {isSignup ? 'Already have an account?' : 'Need a workspace?'}{' '}
              <Link href={isSignup ? '/auth/login' : '/auth/signup'} className="font-semibold no-underline" style={{ color: 'var(--accent-text)' }}>
                {isSignup ? 'Log in' : 'Sign up'}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
