// frontend/src/pages/WeeklyReport.jsx
import { useState } from 'react'
import { Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react'
import ScoreCard from '../components/ScoreCard'

const API = '/api'

export default function WeeklyReport() {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function fetchReport() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/report/weekly`)
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e) {
      setError('Failed to generate report. Run ingest first.')
    } finally {
      setLoading(false)
    }
  }

  function downloadReport() {
    if (!report) return
    const blob = new Blob([report.report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `knowledgeloop-weekly-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = report?.stats

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink mb-1">Weekly Intelligence Report</h1>
          <p className="text-slate-500 text-sm">AI-generated summary of all customer data from the past week.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReport} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><RefreshCw className="w-4 h-4" /> Generate Report</>}
          </button>
          {report && (
            <button onClick={downloadReport} className="btn-ghost flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-md p-4 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="bg-white border border-surface-border p-10 text-center space-y-3 rounded-md shadow-sm">
          <p className="text-4xl">📊</p>
          <p className="text-slate-700 font-bold">No report generated yet.</p>
          <p className="text-slate-500 text-sm">Click "Generate Report" to create your weekly AI summary.</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <ScoreCard label="Total Records"  value={stats.total_records} />
          <ScoreCard label="Positive"       value={`${stats.positive_pct}%`} />
          <ScoreCard label="Negative"       value={`${stats.negative_pct}%`} />
          <ScoreCard label="Urgent Issues"  value={stats.urgent_issues} trend="down" />
          <ScoreCard label="Approved FAQs"  value={stats.approved_faqs} />
          <ScoreCard label="Sources"        value={Object.keys(stats.source_breakdown).length} />
        </div>
      )}

      {report?.report && (
        <div className="bg-white border border-surface-border p-6 rounded-md shadow-sm animate-slide-up">
          <div className="prose max-w-none">
            {report.report.split('\n').map((line, i) => {
              if (/^\d+\.\s/.test(line) || /^#{1,3}\s/.test(line) || line.trim().endsWith(':')) {
                return <h3 key={i} className="text-ink font-black text-base mt-5 mb-2 first:mt-0">{line.replace(/^#+\s/, '')}</h3>
              }
              if (line.trim() === '') return <div key={i} className="h-2" />
              return <p key={i} className="text-slate-600 text-sm leading-relaxed">{line}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
