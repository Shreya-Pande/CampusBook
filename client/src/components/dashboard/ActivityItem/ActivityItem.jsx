import { Bell, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ActivityItem.css'

const ICONS = {
  confirmed: { icon: CheckCircle2, className: 'text-emerald-500' },
  waitlist: { icon: Bell, className: 'text-amber-500' },
  completed: { icon: Clock, className: 'text-gray-400 dark:text-gray-500' },
  rejected: { icon: XCircle, className: 'text-red-500' },
}

// variant: 'confirmed' | 'waitlist' | 'completed' | 'rejected'
const ActivityItem = ({ variant = 'completed', title, description, timestamp, actionLabel, actionTo }) => {
  const { icon: Icon, className } = ICONS[variant] || ICONS.completed

  return (
    <li className="activity-item flex items-start gap-3 py-3">
      <span className={`mt-0.5 shrink-0 ${className}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{timestamp}</p>
      </div>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="activity-action shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          {actionLabel}
        </Link>
      )}
    </li>
  )
}

export default ActivityItem
