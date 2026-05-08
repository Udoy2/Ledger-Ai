// frontend/src/pages/ChatWidget.jsx
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, AlertCircle } from 'lucide-react'
import SourceBadge from '../components/SourceBadge'

const API = '/api'

const SUGGESTED = [
  "What is your return policy?",
  "How long does shipping take?",
  "Do you ship internationally?",
  "How do I track my order?",
]

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm KnowledgeLoop's AI assistant. Ask me anything about orders, shipping, returns, or products.", sources: [] }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text) {
    const question = text ?? input.trim()
    if (!question || loading) return
    setInput('')
    setError('')
    setMessages((m) => [...m, { role: 'user', text: question, sources: [] }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', text: data.answer, sources: data.sources ?? [] }])
    } catch (e) {
      setError('Failed to get a response. Make sure the backend is running and data is ingested.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-3rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-ink mb-1">RAG Chat Assistant</h1>
        <p className="text-slate-500 text-sm">Ask questions — answers are grounded in your real customer data.</p>
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED.map((q) => (
          <button key={q} onClick={() => sendMessage(q)}
            className="btn-ghost text-xs">{q}</button>
        ))}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
              ${msg.role === 'assistant' ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700'}`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                ${msg.role === 'assistant'
                  ? 'bg-white border border-surface-border text-slate-700 rounded-tl-sm'
                  : 'bg-brand-500 text-white rounded-tr-sm'}`}>
                {msg.text}
              </div>
              {msg.sources?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.sources.map((s, j) => <SourceBadge key={j} source={s.source} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-700" />
            </div>
            <div className="bg-white border border-surface-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-md text-xs mb-2 p-3 shadow-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn-primary px-4">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
