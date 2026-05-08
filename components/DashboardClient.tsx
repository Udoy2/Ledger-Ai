'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DatabaseZap, FileText, RefreshCw } from 'lucide-react';

type DashboardClientProps = {
  hasSignals: boolean;
  liveBackend?: boolean;
};

async function postJson(path: string) {
  const response = await fetch(path, { method: 'POST' });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error ?? 'Request failed');
  }
  return json;
}

export function DashboardActions({ hasSignals, liveBackend = true }: DashboardClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(path: string) {
    startTransition(async () => {
      await postJson(path);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => run('/api/seed')}
        disabled={pending || hasSignals || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DatabaseZap size={16} />
        {hasSignals ? 'Demo loaded' : 'Load demo data'}
      </button>
      <button
        onClick={() => run('/api/report/generate')}
        disabled={pending || !liveBackend}
        className="inline-flex items-center gap-2 rounded-md bg-loop px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
        Generate report
      </button>
    </div>
  );
}
