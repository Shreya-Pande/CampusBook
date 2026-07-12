import { useMemo } from 'react'
import { useMyBookings } from '../../../hooks/useBookings'
import Skeleton from '../../ui/Skeleton/Skeleton'
import './TodaySchedule.css'

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const BORDER_CLASS = {
  upcoming: 'border-l-blue-500',
  active: 'border-l-emerald-500',
  completed: 'border-l-gray-300 dark:border-l-gray-700',
}

const STATUS_LABEL = {
  upcoming: 'Upcoming',
  active: 'Now',
  completed: 'Completed',
}

// Today's approved bookings, sorted chronologically, with a colored left
// border reflecting whether the slot is upcoming, happening now, or done.
const TodaySchedule = () => {
  const { data: bookings = [], isLoading, isError } = useMyBookings({ status: 'approved' })

  const todaysBookings = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return bookings
      .filter((booking) => new Date(booking.date).toISOString().slice(0, 10) === todayStr)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  }, [bookings])

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  const statusOf = (booking) => {
    const start = timeToMinutes(booking.startTime)
    const end = timeToMinutes(booking.endTime)
    if (nowMinutes < start) return 'upcoming'
    if (nowMinutes < end) return 'active'
    return 'completed'
  }

  return (
    <div className="today-schedule rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Schedule</h2>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : isError ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Couldn&apos;t load your schedule.</p>
        ) : todaysBookings.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Nothing booked for today.</p>
        ) : (
          todaysBookings.map((booking) => {
            const status = statusOf(booking)
            return (
              <div
                key={booking._id}
                className={`today-schedule-item flex items-center justify-between rounded-r-lg border-l-4 bg-gray-50 px-3 py-2 dark:bg-gray-800/50 ${BORDER_CLASS[status]}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {booking.resourceIds?.[0]?.name || 'Resource'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {booking.startTime} – {booking.endTime}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                  {STATUS_LABEL[status]}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TodaySchedule
