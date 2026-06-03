'use client';

import { FormEvent, useEffect, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; text: string };

function getEmbedKey() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('key') ?? '';
}

function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  const k = 'kl_faq_session_id';
  const existing = window.localStorage.getItem(k);
  if (existing) return existing;
  const id = `faq_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  window.localStorage.setItem(k, id);
  return id;
}

export default function EmbeddedFaqPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi, ask me anything about products, delivery, returns, or payment.' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const [key, setKey] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setKey(getEmbedKey());
    setSessionId(getSessionId());
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    setInput('');
    setError('');
    setMessages((p) => [...p, { role: 'user', text: message }]);
    setPending(true);
    try {
      const res = await fetch('/api/embed/faq/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key,
          message,
          session_id: sessionId,
          page_url: typeof document !== 'undefined' ? document.referrer : '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error ?? 'Request failed'));
      setMessages((p) => [...p, { role: 'assistant', text: String(json.answer ?? '') }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      setMessages((p) => [...p, { role: 'assistant', text: 'Sorry, I could not answer right now. Please try again.' }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="h-full min-h-[560px] bg-white text-slate-900">
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-200 px-4 py-3">
          <h1 className="text-sm font-black">Product FAQ Assistant</h1>
          <p className="text-xs text-slate-500">Answers from your business knowledge base</p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <p className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                {m.text}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about product details, shipping, returns..."
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={pending || !key}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? '...' : 'Send'}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
          {!key ? <p className="mt-2 text-xs text-red-600">Missing widget key.</p> : null}
        </form>
      </div>
    </main>
  );
}
