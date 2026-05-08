// frontend/src/components/ScoreCard.jsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ScoreCard({ label, value, unit = '', trend = null }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-brand-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <div className="bg-white border border-surface-border rounded-md shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
        {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black text-ink">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500 mb-1">{unit}</span>}
      </div>
    </div>
  )
}
