// frontend/src/pages/GapsDashboard.jsx
import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import GapCard from '../components/GapCard'

const API = '/api'

export default function GapsDashboard() {
  const [gaps, setGaps]     = useState([])
  const [faqs, setFaqs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState('gaps')

  useEffect(() => {
    Promise.all([
      fetch(`${API}/gaps`).then((r) => r.json()),
      fetch(`${API}/gaps/faqs`).then((r) => r.json()),
    ])
      .then(([gData, fData]) => {
        setGaps(gData.gaps ?? [])
        setFaqs(fData.faqs ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleApproved(approved) {
    setGaps((prev) => prev.filter((g) => g.id !== approved.question_id))
    setFaqs((prev) => [{ id: Date.now(), question: approved.question, answer: approved.answer, approved_at: new Date().toISOString() }, ...prev])
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">Knowledge Gap Dashboard</h1>
        <p className="text-slate-500 text-sm">Unanswered customer questions — approve or write answers to build your FAQ.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {[['gaps', `Unanswered (${gaps.length})`], ['faqs', `Approved FAQs (${faqs.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`btn-ghost text-sm ${tab === key ? 'bg-brand-50 text-brand-700 font-bold border-brand-200 shadow-sm' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-3 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>}
      {error   && <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 p-4 rounded-md shadow-sm"><AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span></div>}

      {tab === 'gaps' && (
        <div className="grid gap-3">
          {gaps.length === 0 && !loading && (
            <div className="bg-white border border-surface-border p-6 text-center text-slate-500 text-sm rounded-md shadow-sm">
              🎉 No unanswered questions! All caught up.
            </div>
          )}
          {gaps.map((g) => <GapCard key={g.id} gap={g} onApproved={handleApproved} />)}
        </div>
      )}

      {tab === 'faqs' && (
        <div className="grid gap-3">
          {faqs.length === 0 && !loading && (
            <p className="text-slate-500 text-sm">No FAQs approved yet. Approve gaps to build your knowledge base.</p>
          )}
          {faqs.map((faq) => (
            <div key={faq.id} className="glass-card p-5 space-y-2 animate-slide-up">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" />
                <p className="font-bold text-ink text-sm">{faq.question}</p>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed pl-6">{faq.answer}</p>
              <p className="text-xs text-slate-500 pl-6">{new Date(faq.approved_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
