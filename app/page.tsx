import Link from 'next/link';
import { ArrowRight, BarChart3, Bell, MessageSquareText, PlugZap, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';

const sources = ['Shopify / WooCommerce', 'Google Reviews', 'Facebook + Instagram', 'GA4 Analytics', 'Support chats', 'Heatmaps'];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-loop">
          <BarChart3 size={22} />
          KnowledgeLoop
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white">
            Log in
          </Link>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white">
            Start MVP
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-10 lg:grid-cols-[1fr_520px] lg:items-center">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-loop">
            <Sparkles size={16} />
            Frictionless AI insights for e-commerce owners
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.05] text-ink sm:text-6xl">
            Your store, reviews, comments, chats, and analytics finally talk to each other.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Connect once, then KnowledgeLoop continuously pulls customer voice and behavior data, tags every signal, and sends plain-English action lists.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-md bg-loop px-5 py-3 font-bold text-white transition hover:bg-emerald-700">
              Create workspace
              <ArrowRight size={18} />
            </Link>
            <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 font-bold text-slate-700 hover:border-slate-300">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-loop">Live insight preview</p>
              <h2 className="text-xl font-black text-ink">What the owner sees</h2>
            </div>
            <RefreshCw className="text-loop" size={22} />
          </div>
          <div className="space-y-3">
            <div className="border-l-4 border-red-500 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">Critical pattern</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Shipping clarity is hurting checkout confidence. This appears in reviews, support chats, Facebook comments, and abandoned carts.
              </p>
            </div>
            <div className="border-l-4 border-loop bg-emerald-50 p-4">
              <p className="text-sm font-bold text-loop">Revenue opportunity</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Forest green demand is rising. Restock or open pre-orders while social intent is visible.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-slate-50 p-3">
                <p className="text-2xl font-black text-ink">17</p>
                <p className="text-xs text-slate-500">Signals</p>
              </div>
              <div className="bg-slate-50 p-3">
                <p className="text-2xl font-black text-ink">3</p>
                <p className="text-xs text-slate-500">Urgent</p>
              </div>
              <div className="bg-slate-50 p-3">
                <p className="text-2xl font-black text-ink">72h</p>
                <p className="text-xs text-slate-500">Cycle</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: PlugZap, title: 'Connect', text: 'OAuth-ready integration slots for store, reviews, social, analytics, and chat data.' },
            { icon: ShoppingBag, title: 'Collect', text: 'Scheduled collectors normalize orders, carts, reviews, comments, pages, and questions into signals.' },
            { icon: MessageSquareText, title: 'Analyze', text: 'AI tags sentiment, topic, urgency, then detects patterns across sources.' },
            { icon: Bell, title: 'Act', text: 'Owners get reports, dashboard insight feed, and future Slack or WhatsApp alerts.' },
          ].map((item) => (
            <div key={item.title} className="border border-line bg-slate-50 p-5">
              <item.icon className="text-loop" size={24} />
              <h3 className="mt-4 font-black text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
          <div className="border border-line bg-ink p-5 text-white lg:col-span-2">
            <h3 className="font-black">MVP source map</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {sources.map((source) => (
                <span key={source} className="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
