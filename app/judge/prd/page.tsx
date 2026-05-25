import { readFile } from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';

async function loadPrd() {
  const filePath = path.join(process.cwd(), 'docs', 'JUDGE_PRD.md');
  return readFile(filePath, 'utf-8');
}

export default async function JudgePrdPage() {
  const content = await loadPrd();

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-900">Project PRD</h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Back to dashboard
          </Link>
        </div>
        <article className="surface p-6">
          <div className="prose-report max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </main>
  );
}
