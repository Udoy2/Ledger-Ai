// frontend/src/components/InsightCard.jsx
import SourceBadge from './SourceBadge'

const SENTIMENT_STYLES = {
  positive: 'border-l-brand-500 bg-brand-50',
  negative: 'border-l-red-500 bg-red-50',
  neutral:  'border-l-slate-400 bg-white',
}

export default function InsightCard({ insight }) {
  const { theme, description, sources = [], sentiment = 'neutral', frequency } = insight
  const borderStyle = SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral

  return (
    <div className={`border-y border-r border-surface-border border-l-4 rounded-md shadow-sm ${borderStyle} p-5 animate-slide-up`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-ink text-sm leading-snug">{theme}</h3>
        {frequency != null && (
          <span className="text-xs text-slate-500 font-medium shrink-0">{frequency} mentions</span>
        )}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed mb-3">{description}</p>
      <div className="flex flex-wrap gap-1.5 mt-2 pt-3 border-t border-surface-border/50">
        {sources.map((s) => <SourceBadge key={s} source={s} />)}
      </div>
    </div>
  )
}
