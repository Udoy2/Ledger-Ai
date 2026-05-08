import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';

type AuthFormProps = {
  mode: 'signup' | 'login';
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthForm({ mode, action, error }: AuthFormProps) {
  const isSignup = mode === 'signup';

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1fr_440px]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-loop">
            <BarChart3 size={20} />
            KnowledgeLoop
          </Link>

          <div className="max-w-2xl py-14">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-loop">AI business intelligence</p>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              Connect your store once. Get the next best move every 72 hours.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              KnowledgeLoop turns reviews, comments, carts, support chats, and analytics into one plain-English insight feed.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="border-t border-line pt-3">Google, Shopify, social, chat, analytics</div>
            <div className="border-t border-line pt-3">AI sentiment, topics, urgency</div>
            <div className="border-t border-line pt-3">Reports, alerts, and action lists</div>
          </div>
        </section>

        <section className="flex items-center bg-white px-6 py-10 shadow-soft sm:px-10">
          <form action={action} className="w-full space-y-5">
            <div>
              <h2 className="text-2xl font-black text-ink">{isSignup ? 'Start your loop' : 'Welcome back'}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {isSignup ? 'Create the owner account and your business workspace.' : 'Open your business intelligence dashboard.'}
              </p>
            </div>

            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            {isSignup ? (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Business name</span>
                <input
                  name="businessName"
                  required
                  placeholder="Northstar Leather"
                  className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none ring-loop/20 focus:ring-4"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="owner@example.com"
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none ring-loop/20 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 outline-none ring-loop/20 focus:ring-4"
              />
            </label>

            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-loop px-4 py-3 font-bold text-white transition hover:bg-emerald-700">
              {isSignup ? 'Create workspace' : 'Log in'}
              <ArrowRight size={18} />
            </button>

            <p className="text-center text-sm text-slate-500">
              {isSignup ? 'Already have an account?' : 'Need a workspace?'}{' '}
              <Link href={isSignup ? '/auth/login' : '/auth/signup'} className="font-bold text-loop">
                {isSignup ? 'Log in' : 'Sign up'}
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
