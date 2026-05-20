'use client';

import { FormEvent, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

export function RagChat() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const question = prompt.trim();
    if (!question || loading) return;
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: question, topK: 10 }),
      });
      const json = await res.json();
      const answer = res.ok ? String(json.answer ?? 'No answer generated.') : String(json.error ?? 'Request failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle size={18} className="text-loop" />
        <h2 className="text-xl font-black text-ink">RAG Chat</h2>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto border border-line bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Ask about trends, risks, conversion, retention, and what to improve next.</p>
        ) : (
          messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <p className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${m.role === 'user' ? 'bg-loop text-white' : 'bg-white text-slate-700 border border-line'}`}>
                {m.content}
              </p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask your business AI..."
          className="flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-loop"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-loop px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          <Send size={14} />
          {loading ? 'Thinking' : 'Send'}
        </button>
      </form>
    </div>
  );
}
