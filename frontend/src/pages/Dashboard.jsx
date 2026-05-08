// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import ScoreCard from '../components/ScoreCard'
import InsightCard from '../components/InsightCard'

const API = '/api'

function useFetch(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [url])
  return { data, loading, error }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48 gap-3 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading…
    </div>
  )
}
function ErrorState({ message }) {
  return (
    <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 p-4 rounded-md shadow-sm">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm">{message}. Run <strong>POST /ingest</strong> first via the sidebar button.</span>
    </div>
  )
}

export default function Dashboard() {
  const patterns = useFetch(`${API}/insights/patterns`)
  const reviews  = useFetch(`${API}/reviews`)
  const opps     = useFetch(`${API}/insights/opportunities`)

  const repScore  = reviews.data?.reputation_score ?? '—'
  const totalRevs = reviews.data?.total ?? '—'
  const oppCount  = opps.data?.opportunities?.length ?? '—'
  const patCount  = patterns.data?.patterns?.length ?? '—'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">Business Intelligence Dashboard</h1>
        <p className="text-slate-500 text-sm">AI-powered insights across all your customer data sources.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ScoreCard label="Reputation Score" value={repScore} unit="/ 5" trend="up" color="emerald" />
        <ScoreCard label="Total Reviews"    value={totalRevs}                  color="brand" />
        <ScoreCard label="Opportunities"    value={oppCount}                   color="amber" />
        <ScoreCard label="Patterns Found"   value={patCount}                   color="purple" />
      </div>

      {/* Insights Feed */}
      <section>
        <h2 className="text-lg font-black text-ink mb-4">Cross-Source Patterns</h2>
        {patterns.loading && <LoadingState />}
        {patterns.error   && <ErrorState message={patterns.error} />}
        {patterns.data?.patterns?.length === 0 && (
          <p className="text-slate-500 text-sm">No patterns found. Run ingest to analyze data.</p>
        )}
        <div className="grid gap-3">
          {patterns.data?.patterns?.map((p, i) => <InsightCard key={i} insight={p} />)}
        </div>
      </section>

      {/* Top Opportunities */}
      <section>
        <h2 className="text-lg font-black text-ink mb-4">Top Opportunities</h2>
        {opps.loading && <LoadingState />}
        {opps.error   && <ErrorState message={opps.error} />}
        <div className="grid gap-3">
          {opps.data?.opportunities?.map((opp, i) => (
            <div key={i} className="glass-card p-4 flex items-start gap-4 animate-slide-up">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-amber-100 border border-amber-200
                              flex items-center justify-center font-bold text-amber-700 text-sm">
                {opp.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm">{opp.issue}</p>
                <p className="text-slate-500 text-sm mt-0.5">{opp.recommendation}</p>
                <div className="flex gap-2 mt-2">
                  <span className="badge bg-slate-100 text-slate-600">{opp.frequency} mentions</span>
                  <span className={`badge ${opp.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                    {opp.sentiment}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
