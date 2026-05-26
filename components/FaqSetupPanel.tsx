'use client';

import { useState } from 'react';
import { BookText, Link, Plus, RefreshCw } from 'lucide-react';

type Props = { docsCount: number };

async function postJson(path: string, body?: Record<string, unknown>) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(json?.error ?? 'Request failed'));
  return json;
}

export function FaqSetupPanel({ docsCount }: Props) {
  const [origins, setOrigins]     = useState('');
  const [title, setTitle]         = useState('');
  const [url, setUrl]             = useState('');
  const [content, setContent]     = useState('');
  const [snippet, setSnippet]     = useState('');
  const [pending, setPending]     = useState(false);
  const [error, setError]         = useState('');
  const [uploaded, setUploaded]   = useState(docsCount);

  const parseOrigins = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

  async function connectWidget() {
    try {
      setPending(true); setError('');
      const docs = title.trim() && content.trim()
        ? [{ title: title.trim(), content: content.trim(), url: url.trim() || undefined }]
        : [];
      const json = await postJson('/api/integrations/faq-widget/connect', {
        allowed_origins: parseOrigins(origins), docs,
      });
      setSnippet(String(json?.snippet ?? ''));
      const n = Number(json?.docs_uploaded ?? 0);
      if (n > 0) setUploaded((p) => p + n);
      if (docs.length) { setTitle(''); setUrl(''); setContent(''); }
      if (json?.snippet) await navigator.clipboard.writeText(String(json.snippet));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setPending(false); }
  }

  async function addDoc() {
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
    try {
      setPending(true); setError('');
      const json = await postJson('/api/integrations/faq-widget/docs', {
        docs: [{ title: title.trim(), content: content.trim(), url: url.trim() || undefined }],
      });
      setUploaded((p) => p + Number(json?.inserted ?? 0));
      setTitle(''); setUrl(''); setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setPending(false); }
  }

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl text-xs';

  return (
    <div className="surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <BookText size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            FAQ Widget Setup
          </h2>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold mono-label"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid var(--border)' }}
        >
          {uploaded} doc{uploaded !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
        Step 1: Add knowledge docs. Step 2: Click connect. Step 3: Paste the copied script on your website.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Allowed origins (optional, comma-separated)
          </label>
          <input value={origins} onChange={(e) => setOrigins(e.target.value)}
            placeholder="localhost:3000, yourstore.com" className={inputClass} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Document title
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shipping Policy" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Reference URL (optional)
            </label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourstore.com/shipping" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Document content
          </label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            rows={5} placeholder="Paste FAQ text here — the system chunks and embeds it for widget answers."
            className={inputClass} style={{ resize: 'vertical' }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={addDoc} disabled={pending}
          className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-60">
          <Plus size={13} /> Add doc only
        </button>
        <button onClick={connectWidget} disabled={pending}
          className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-60">
          {pending ? <RefreshCw size={13} className="animate-spin" /> : <Link size={13} />}
          Connect + copy script
        </button>
      </div>

      {snippet && (
        <div className="mt-4">
          <label className="block text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Embed snippet (copied to clipboard)
          </label>
          <textarea readOnly value={snippet} rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl text-[10px] font-mono"
            style={{ color: 'var(--accent-text)', resize: 'none' }} />
        </div>
      )}

      {error && (
        <div className="mt-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          style={{ background: 'var(--red-subtle)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
