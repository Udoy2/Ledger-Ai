// frontend/src/components/SourceBadge.jsx
const SOURCE_CONFIG = {
  google_reviews: { label: 'Google', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  facebook:       { label: 'Facebook', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  support:        { label: 'Support', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  analytics:      { label: 'Analytics', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  orders:         { label: 'Orders', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export default function SourceBadge({ source }) {
  const config = SOURCE_CONFIG[source] ?? { label: source, color: 'bg-slate-50 text-slate-700 border-slate-200' }
  return (
    <span className={`badge border ${config.color}`}>
      {config.label}
    </span>
  )
}
