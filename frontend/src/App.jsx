// frontend/src/App.jsx
import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Star, MessageSquare, HelpCircle,
  FileText, Zap, Loader2, Brain
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Reviews from './pages/Reviews'
import ChatWidget from './pages/ChatWidget'
import GapsDashboard from './pages/GapsDashboard'
import WeeklyReport from './pages/WeeklyReport'

const API = '/api'

const NAV = [
  { to: '/',        label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/reviews', label: 'Reviews',      Icon: Star },
  { to: '/chat',    label: 'Chat (RAG)',   Icon: MessageSquare },
  { to: '/gaps',    label: 'Knowledge Gaps', Icon: HelpCircle },
  { to: '/report',  label: 'Weekly Report', Icon: FileText },
]

export default function App() {
  const [ingesting, setIngesting] = useState(false)
  const [ingestStatus, setIngestStatus] = useState(null)
  const navigate = useNavigate()

  async function handleIngest() {
    setIngesting(true)
    setIngestStatus(null)
    try {
      const res = await fetch(`${API}/ingest`, { method: 'POST' })
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      setIngestStatus({ ok: true, ...data })
      setTimeout(() => navigate('/'), 300)
    } catch (err) {
      setIngestStatus({ ok: false, message: `Error: ${err.message}` })
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-alt">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-surface-border p-4 gap-2 shadow-sm relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-3">
          <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg text-ink">KnowledgeLoop</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-bold">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Ingest button */}
        <div className="pt-4 border-t border-surface-border space-y-2">
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            {ingesting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingesting…</>
              : <><Zap className="w-4 h-4" /> Run Ingest</>
            }
          </button>
          {ingestStatus && (
            <p className={`text-xs px-1 font-bold ${ingestStatus.ok ? 'text-brand-500' : 'text-red-500'}`}>
              {ingestStatus.ok
                ? `✓ ${ingestStatus.embedded} records embedded`
                : ingestStatus.message}
            </p>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/chat"    element={<ChatWidget />} />
          <Route path="/gaps"    element={<GapsDashboard />} />
          <Route path="/report"  element={<WeeklyReport />} />
        </Routes>
        </div>
      </main>
    </div>
  )
}
