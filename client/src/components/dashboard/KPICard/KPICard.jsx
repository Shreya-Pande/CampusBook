import { useEffect, useState } from 'react'
import Skeleton from '../../ui/Skeleton/Skeleton'
import './KPICard.css'

const COLOR_VARIANTS = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
}

// Counts up from 0 to the target value over ~700ms whenever it changes.
const useCountUp = (target, durationMs = 700) => {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const end = Number(target) || 0
    if (end === 0) {
      setDisplay(0)
      return undefined
    }

    const start = performance.now()
    let frame

    const step = (now) => {
      const progress = Math.min((now - start) / durationMs, 1)
      setDisplay(Math.round(end * progress))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return display
}

const KPICard = ({ value, label, subtitle, icon: Icon, color = 'indigo', isLoading = false }) => {
  const display = useCountUp(value)

  return (
    <div className="kpi-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="kpi-value mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{display}</p>
          )}
          {subtitle && <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
        {Icon && (
          <span
            className={`kpi-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              COLOR_VARIANTS[color] || COLOR_VARIANTS.indigo
            }`}
          >
            <Icon size={20} />
          </span>
        )}
      </div>
    </div>
  )
}

export default KPICard
