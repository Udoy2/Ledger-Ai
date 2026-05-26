'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Bot, DatabaseZap, FileText, Link, RefreshCw, Sparkles } from 'lucide-react';

type DashboardClientProps = {
  hasSignals: boolean;
  liveBackend?: boolean;
};

async function postJson(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

export function DashboardActions({ hasSignals, liveBackend = true }: DashboardClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body?: Record<string, unknown>) {
    try {
      setError(null);
      setPending(true);
      await postJson(path, body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPending(false);
    }
  }

  async function connectClarity() {
    const token = window.prompt('Paste Microsoft Clarity Data Export API token');
    if (!token) return;
    await run('/api/integrations/clarity/connect', { clarity_api_token: token });
  }

  async function syncClarity() {
    const raw = window.prompt('Clarity window in days (1-3)', '1');
    if (!raw) return;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1 || num > 3) {
      setError('Clarity numOfDays must be between 1 and 3.');
      return;
    }
    await run('/api/cron/collect/clarity', { numOfDays: num, dimension1: 'URL' });
  }

  const btnBase =
    'btn-secondary inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run('/api/seed')}
          disabled={pending || hasSignals || !liveBackend}
          className={btnBase}
          title="Seed initial demo data"
        >
          <DatabaseZap size={13} style={{ color: 'var(--accent)' }} />
          {hasSignals ? 'Demo loaded' : 'Load demo data'}
        </button>

        <div
          style={{ width: '1px', height: '20px', background: 'var(--border)' }}
          className="hidden sm:block"
        />

        <button
          onClick={() => { if (liveBackend) window.location.href = '/api/integrations/ga4/connect'; }}
          disabled={pending || !liveBackend}
          className={btnBase}
        >
          <Link size={13} style={{ color: 'var(--blue)' }} />
          Connect GA4
        </button>

        <button
          onClick={() => run('/api/cron/collect/ga4')}
          disabled={pending || !liveBackend}
          className={btnBase}
        >
          <Activity size={13} style={{ color: 'var(--accent)' }} />
          Sync GA4
        </button>

        <button
          onClick={connectClarity}
          disabled={pending || !liveBackend}
          className={btnBase}
        >
          <Link size={13} style={{ color: 'var(--blue)' }} />
          Connect Clarity
        </button>

        <button
          onClick={syncClarity}
          disabled={pending || !liveBackend}
          className={btnBase}
        >
          <Activity size={13} style={{ color: 'var(--blue)' }} />
          Sync Clarity
        </button>

        <button
          onClick={() => run('/api/cto/run')}
          disabled={pending || !liveBackend}
          className={btnBase}
          title="Run multi-agent AI orchestrator"
        >
          <Bot size={13} style={{ color: '#a78bfa' }} />
          Run AI CTO
        </button>

        {/* Primary CTA — right-aligned */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => run('/api/report/generate')}
            disabled={pending || !liveBackend}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold disabled:cursor-not-allowed"
          >
            {pending
              ? <RefreshCw size={13} className="animate-spin" />
              : <Sparkles size={13} />
            }
            Generate Report
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            background: 'var(--red-subtle)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--red)',
          }}
        >
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
}
