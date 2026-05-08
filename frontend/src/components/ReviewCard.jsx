// frontend/src/components/ReviewCard.jsx
import { Star, Loader2 } from 'lucide-react'
import { useState } from 'react'
import SourceBadge from './SourceBadge'

const API = '/api'

const STAR_COLORS = { 5: 'text-brand-500', 4: 'text-blue-500', 3: 'text-amber-500', 2: 'text-orange-500', 1: 'text-red-500' }

export default function ReviewCard({ review }) {
  const { id, source, content, sentiment, topic, urgency, date, star_rating, author } = review
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateReply() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/reviews/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: id, star_rating: star_rating ?? 3, review_text: content }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReply(data.reply)
    } catch {
      setError('Could not generate reply. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const starColor = STAR_COLORS[star_rating] ?? 'text-slate-400'

  return (
    <div className="glass-card p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={source} />
          {urgency === 'high' && (
            <span className="badge bg-red-50 text-red-700 border border-red-200">Urgent</span>
          )}
          {topic && (
            <span className="badge bg-slate-100 text-slate-600 border border-slate-200">{topic.replace(/_/g, ' ')}</span>
          )}
        </div>
        {star_rating && (
          <div className={`flex items-center gap-0.5 ${starColor} shrink-0`}>
            {Array.from({ length: star_rating }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-current" />
            ))}
          </div>
        )}
      </div>

      {author && <p className="text-xs text-slate-500">{author} · {date}</p>}
      <p className="text-slate-600 text-sm leading-relaxed">{content}</p>

      {reply && (
        <div className="bg-brand-50 border border-brand-200 rounded-md p-3 shadow-sm">
          <p className="text-xs tracking-wide uppercase text-brand-700 font-bold mb-1">AI Reply Draft</p>
          <p className="text-slate-700 text-sm leading-relaxed">{reply}</p>
        </div>
      )}
      {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

      <button onClick={generateReply} disabled={loading} className="btn-ghost text-xs flex items-center gap-1.5">
        {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : '✦ Generate AI Reply'}
      </button>
    </div>
  )
}
