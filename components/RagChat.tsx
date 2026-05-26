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
      const answer = res.ok
        ? String(json.answer ?? 'No answer generated.')
        : String(json.error ?? 'Request failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={16} style={{ color: 'var(--accent)' }} />
        <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Analyst Chat
        </h2>
      </div>

      {/* Message thread */}
      <div
        className="max-h-72 min-h-[100px] space-y-3 overflow-y-auto p-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {messages.length === 0 ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Ask about trends, risks, conversion, retention — the AI has semantic access to all your signals.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <p
                className="inline-block max-w-[88%] whitespace-pre-wrap text-xs leading-relaxed px-3.5 py-2.5 rounded-xl"
                style={
                  m.role === 'user'
                    ? { background: 'var(--accent)', color: '#fff', fontWeight: 500 }
                    : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {m.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask your store AI..."
          className="flex-1 px-3.5 py-2.5 rounded-xl text-xs"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60 shrink-0 inline-flex items-center gap-1.5"
        >
          <Send size={12} />
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
