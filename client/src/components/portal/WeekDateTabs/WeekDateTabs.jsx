import { usePortalStore } from '../../../store/portalStore'
import { getWeekdayDates } from '../../../utils/dateUtils'
import './WeekDateTabs.css'

// Date selection is for browsing/checking availability, which must work
// regardless of portal open/closed status (and for anonymous visitors) —
// only the actual booking action is gated on the portal being open. That
// gate lives in ResourceCard/BookingModal, not here.
const WeekDateTabs = ({ selectedDate, onSelect }) => {
  const currentWeek = usePortalStore((state) => state.currentWeek)
  const days = getWeekdayDates(currentWeek?.weekStartDate)

  if (days.length === 0) return null

  return (
    <div className="week-date-tabs flex flex-wrap gap-2">
      {days.map(({ iso, label }) => {
        const isSelected = iso === selectedDate

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect?.(iso)}
            className={`week-date-tab rounded-lg border px-4 py-2 text-sm font-medium transition ${
              isSelected
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default WeekDateTabs
