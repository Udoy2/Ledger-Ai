'use client';

import { useState } from 'react';
import { Activity, DatabaseZap, FileText, Link, RefreshCw } from 'lucide-react';

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
  if (!response.ok) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json;
}

export function DashboardActions({ hasSignals, liveBackend = true }: DashboardClientProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body?: Record<string, unknown>) {
    try {
      setError(null);
      setPending(true);
      await postJson(path, body);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <button
        onClick={() => run('/api/seed')}
        disabled={pending || hasSignals || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DatabaseZap size={16} />
        {hasSignals ? 'Demo loaded' : 'Load demo data'}
      </button>
      <button
        onClick={() => run('/api/integrations/ga4/connect', { ga4_property_id: 'test-property' })}
        disabled={pending || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Link size={16} />
        Connect GA (test)
      </button>
      <button
        onClick={() => run('/api/cron/collect/ga4')}
        disabled={pending || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Activity size={16} />
        Sync GA test data
      </button>
      <button
        onClick={() => run('/api/report/generate')}
        disabled={pending || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md bg-loop px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
        Generate report
      </button>
      {error ? <p className="w-full text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
