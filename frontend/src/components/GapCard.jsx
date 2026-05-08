// frontend/src/components/GapCard.jsx
import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'

const API = '/api'

export default function GapCard({ gap, onApproved }) {
  const { id, question, source, date } = gap
  const [customAnswer, setCustomAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/gaps/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: id, custom_answer: customAnswer || null }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setApproved(true)
      onApproved?.(data)
    } catch {
      setError('Approval failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (approved) {
    return (
      <div className="bg-brand-50 border border-brand-200 p-5 flex items-center gap-3 animate-fade-in rounded-md shadow-sm">
        <CheckCircle className="w-5 h-5 text-brand-500 shrink-0" />
        <p className="text-brand-700 text-sm font-bold">FAQ approved and added to knowledge base.</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 space-y-3 animate-slide-up">
      <div className="flex items-start justify-between gap-2">
        <span className="badge bg-amber-50 text-amber-700 border border-amber-200">{source}</span>
        <span className="text-xs text-slate-500 font-medium">{date}</span>
      </div>
      <p className="text-ink text-sm font-bold leading-relaxed">{question}</p>

      <textarea
        className="input-field text-sm resize-none h-20"
        placeholder="Write a custom answer, or leave blank to let AI generate one…"
        value={customAnswer}
        onChange={(e) => setCustomAnswer(e.target.value)}
      />

      {error && <p className="text-red-600 font-medium text-xs">{error}</p>}

      <button onClick={handleApprove} disabled={loading} className="btn-primary text-sm flex items-center gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : '✓ Approve as FAQ'}
      </button>
    </div>
  )
}
