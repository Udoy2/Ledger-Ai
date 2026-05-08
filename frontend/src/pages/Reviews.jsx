// frontend/src/pages/Reviews.jsx
import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, Search } from 'lucide-react'
import ReviewCard from '../components/ReviewCard'
import ScoreCard from '../components/ScoreCard'

const API = '/api'

export default function Reviews() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    fetch(`${API}/reviews`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const reviews = data?.reviews ?? []

  const filtered = reviews.filter((r) => {
    const matchText = r.content.toLowerCase().includes(query.toLowerCase()) ||
                      (r.author ?? '').toLowerCase().includes(query.toLowerCase())
    const matchSentiment = filter === 'all' || r.sentiment === filter
    return matchText && matchSentiment
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">Reviews & Reputation</h1>
        <p className="text-slate-500 text-sm">All customer reviews from Google and Facebook with AI reply generator.</p>
      </div>

      {/* Reputation score */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ScoreCard label="Reputation Score" value={data.reputation_score} unit="/ 5" trend="up" />
          <ScoreCard label="Total Reviews"    value={data.total} />
          <ScoreCard label="Avg Rating"       value={data.reputation_score}  unit="★" />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search reviews…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {['all', 'positive', 'neutral', 'negative'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn-ghost text-sm capitalize ${filter === f ? 'bg-brand-50 text-brand-700 font-bold border-brand-200 shadow-sm' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      )}
      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-md p-4 shadow-sm">
          <AlertCircle className="w-5 h-5" /><span className="text-sm">{error} — run ingest first.</span>
        </div>
      )}

      {/* Review list */}
      <div className="grid gap-3">
        {filtered.map((r) => <ReviewCard key={r.id} review={r} />)}
        {!loading && filtered.length === 0 && (
          <p className="text-slate-500 text-sm">No reviews match your filter.</p>
        )}
      </div>
    </div>
  )
}
