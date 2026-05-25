'use client';

import { useState } from 'react';
import { BookText, Link, Plus, RefreshCw } from 'lucide-react';

type Props = {
  docsCount: number;
};

async function postJson(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(json?.error ?? 'Request failed'));
  return json;
}

export function FaqSetupPanel({ docsCount }: Props) {
  const [origins, setOrigins] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [snippet, setSnippet] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [uploadedCount, setUploadedCount] = useState(docsCount);

  function parseOrigins(value: string) {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function connectWidget() {
    try {
      setPending(true);
      setError('');
      const docs = title.trim() && content.trim() ? [{ title: title.trim(), content: content.trim(), url: url.trim() || undefined }] : [];
      const json = await postJson('/api/integrations/faq-widget/connect', {
        allowed_origins: parseOrigins(origins),
        docs,
      });
      setSnippet(String(json?.snippet ?? ''));
      const uploaded = Number(json?.docs_uploaded ?? 0);
      if (uploaded > 0) setUploadedCount((n) => n + uploaded);
      if (docs.length) {
        setTitle('');
        setUrl('');
        setContent('');
      }
      if (json?.snippet) {
        await navigator.clipboard.writeText(String(json.snippet));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  async function addDoc() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required for doc upload.');
      return;
    }
    try {
      setPending(true);
      setError('');
      const json = await postJson('/api/integrations/faq-widget/docs', {
        docs: [{ title: title.trim(), content: content.trim(), url: url.trim() || undefined }],
      });
      setUploadedCount((n) => n + Number(json?.inserted ?? 0));
      setTitle('');
      setUrl('');
      setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookText size={18} className="text-teal-700" />
          <h2 className="text-xl font-semibold text-slate-900">FAQ Widget Setup</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Docs: {uploadedCount}</span>
      </div>

      <p className="mt-2 text-sm text-slate-500">Step 1: Add docs. Step 2: Click connect. Step 3: Paste copied script on business website.</p>

      <div className="mt-4 grid gap-3">
        <input
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
          placeholder="Allowed origins (optional), comma separated"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-teal-700"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Doc title (for example: Shipping Policy)"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-teal-700"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Doc URL (optional)"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-teal-700"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Paste the doc content here. The system chunks and indexes it for FAQ answers."
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-teal-700"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={addDoc}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          <Plus size={15} />
          Add doc only
        </button>
        <button
          onClick={connectWidget}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? <RefreshCw size={15} className="animate-spin" /> : <Link size={15} />}
          Connect + copy script
        </button>
      </div>

      {snippet ? (
        <textarea readOnly value={snippet} rows={3} className="mt-3 w-full rounded-md border border-[var(--line)] bg-slate-50 px-3 py-2 text-xs text-slate-700" />
      ) : null}
      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
