import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import { useMyBookings } from '../../../hooks/useBookings'
import './MiniCalendar.css'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MiniCalendar = () => {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const { data: bookings = [] } = useMyBookings()

  const bookedDates = useMemo(() => {
    const set = new Set()
    bookings.forEach((booking) => set.add(format(new Date(booking.date), 'yyyy-MM-dd')))
    return set
  }, [bookings])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(today), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(today), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [today])

  const handleSelect = (day) => navigate(`/calendar?date=${format(day, 'yyyy-MM-dd')}`)

  return (
    <div className="mini-calendar rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{format(today, 'MMMM yyyy')}</p>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, today)
          const isCurrentDay = isToday(day)
          const hasBooking = bookedDates.has(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(day)}
              className={`mini-calendar-day flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs transition ${
                isCurrentDay
                  ? 'bg-indigo-600 font-semibold text-white'
                  : inMonth
                    ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    : 'text-gray-300 dark:text-gray-700'
              }`}
            >
              {format(day, 'd')}
              {hasBooking && (
                <span className={`mt-0.5 h-1 w-1 rounded-full ${isCurrentDay ? 'bg-white' : 'bg-indigo-500'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
