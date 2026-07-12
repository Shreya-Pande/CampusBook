import { CalendarPlus, Lock, LockOpen } from 'lucide-react'
import { usePortalStore } from '../../../store/portalStore'
import { usePortalStatus } from '../../../hooks/usePortalStatus'
import CountdownTimer from '../CountdownTimer/CountdownTimer'
import './PortalStatusBanner.css'

const toGCalDate = (date) => new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

const buildGoogleCalendarLink = (date) => {
  const start = new Date(date)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'CampusBook portal opens',
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    details: 'The CampusBook weekly booking portal opens now — book your slot before it fills up.',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const formatDateTime = (date) =>
  date && new Date(date).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })

// Static (non-ticking) days/hours-remaining text for the open state — only
// the closed state gets a live per-second countdown, per spec.
const staticRemaining = (targetDate) => {
  if (!targetDate) return null
  const diff = new Date(targetDate) - new Date()
  if (diff <= 0) return null
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) }
}

const PortalStatusBanner = () => {
  // Keeps portalStore hydrated + polling every 60s; the banner itself just
  // reads the store so it re-renders whenever that poll updates it.
  usePortalStatus()
  const status = usePortalStore((state) => state.status)
  const nextOpen = usePortalStore((state) => state.nextOpen)
  const nextClose = usePortalStore((state) => state.nextClose)

  if (!status) return null

  const isOpen = status === 'open'
  const remaining = isOpen ? staticRemaining(nextClose) : null

  return (
    <div
      className={`portal-status-banner flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-sm font-medium sm:justify-between ${
        isOpen
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isOpen ? <LockOpen size={16} /> : <Lock size={16} />}
        {isOpen ? (
          <span>
            Portal open · Closes {formatDateTime(nextClose)}
            {remaining && ` · ${remaining.days}d ${remaining.hours}h remaining`}
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <span>Portal closed · Opens {formatDateTime(nextOpen)}</span>
            <CountdownTimer targetDate={nextOpen} />
          </span>
        )}
      </div>

      {nextOpen && (
        <a
          href={buildGoogleCalendarLink(nextOpen)}
          target="_blank"
          rel="noreferrer"
          className="add-to-calendar-link inline-flex items-center gap-1 underline hover:no-underline"
        >
          <CalendarPlus size={14} />
          Add to Calendar
        </a>
      )}
    </div>
  )
}

export default PortalStatusBanner
