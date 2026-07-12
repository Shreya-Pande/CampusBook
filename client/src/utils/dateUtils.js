import { addDays, format } from 'date-fns'

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// The backend only returns a currentWeek when a WeeklyPortalWindow is
// 'open'/'upcoming' — while the portal is closed there's no window at all,
// so browsing (as opposed to booking) needs a date range that doesn't
// depend on it. Monday of the real-world week the given date falls in.
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

// Given the Monday of a week, returns the 5 Mon-Fri dates as
// { date: Date, dayOfWeek, iso: 'yyyy-MM-dd', label: 'Mon 10' }. Falls back
// to the real-world current week when no weekStartDate is supplied, so date
// tabs are always available for browsing even when the portal is closed.
export const getWeekdayDates = (weekStartDate) => {
  const monday = weekStartDate ? new Date(weekStartDate) : getMondayOfWeek()

  return WEEK_DAYS.map((dayOfWeek, index) => {
    const date = addDays(monday, index)
    return {
      date,
      dayOfWeek,
      iso: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE d'),
    }
  })
}

export const toIsoDate = (date) => format(new Date(date), 'yyyy-MM-dd')

export const formatFriendlyDate = (date) => format(new Date(date), 'EEEE, MMM d')
