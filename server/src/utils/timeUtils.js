export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Formats a Date using its local (server-timezone) calendar fields, e.g.
// "2025-11-10" — unlike toISOString(), this never shifts to the previous/next
// day when the local timezone is ahead/behind UTC.
export const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Returns ['2025-11-10', ..., '2025-11-14'] for the Mon-Fri of the given week.
// Uses local date arithmetic (not toISOString) so results stay correct in
// timezones ahead of UTC, e.g. IST (UTC+5:30) — toISOString() converts to
// UTC first, which rolls local midnight back to the previous day.
export const getWeekDates = (weekStartDate) => {
  const start = new Date(weekStartDate)
  const dates = []

  for (let i = 0; i < DAY_ORDER.length; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(formatLocalDate(date))
  }

  return dates
}

export const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export const getDayOfWeek = (date) => FULL_DAY_NAMES[new Date(date).getDay()]

export const getTimeString = (date) => {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const getCurrentTimeString = () => getTimeString(new Date())

// Monday 00:00 of the week following `from` — always strictly in the future,
// even when `from` itself is a Monday (used by the Sunday 11:55 AM
// pre-generation cron to compute *next* week's window).
export const getNextMonday = (from = new Date()) => {
  const date = startOfDay(from)
  const day = date.getDay() // 0 = Sunday ... 6 = Saturday
  const diff = (8 - day) % 7 || 7
  date.setDate(date.getDate() + diff)
  return date
}

// Friday 17:00 of the same week as the given Monday
export const getNextFriday = (monday) => {
  const date = new Date(monday)
  date.setDate(date.getDate() + 4)
  date.setHours(17, 0, 0, 0)
  return date
}

// Next occurrence (today counts if the time hasn't passed yet) of a given
// weekday + time, relative to `from`.
const nextOccurrence = (targetDay, hours, minutes, from = new Date()) => {
  const date = startOfDay(from)
  const day = date.getDay()
  const diff = (targetDay - day + 7) % 7
  date.setDate(date.getDate() + diff)
  date.setHours(hours, minutes, 0, 0)
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7)
  return date
}

export const getSunday12PM = (from = new Date()) => nextOccurrence(0, 12, 0, from)

export const getSunday1145AM = (from = new Date()) => {
  const date = getSunday12PM(from)
  date.setMinutes(date.getMinutes() - 15)
  return date
}

// Friday 5:00 PM — pass an explicit Friday date to pin the time on it, or
// call with no args to get the next upcoming Friday 5 PM from now.
export const getFriday5PM = (fridayDate, from = new Date()) => {
  const date = fridayDate ? new Date(fridayDate) : nextOccurrence(5, 17, 0, from)
  date.setHours(17, 0, 0, 0)
  return date
}

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const toTimeString = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

// Generates fixed-width [{ start, end }] slots between startTime and endTime,
// e.g. generateTimeSlots('08:00', '22:00', 60) -> [{start:'08:00',end:'09:00'}, ...]
export const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
  const slots = []
  const endMinutes = toMinutes(endTime)

  for (
    let start = toMinutes(startTime);
    start + intervalMinutes <= endMinutes;
    start += intervalMinutes
  ) {
    slots.push({ start: toTimeString(start), end: toTimeString(start + intervalMinutes) })
  }

  return slots
}

// "HH:MM" string comparison works correctly for time ordering
export const slotsOverlap = (start1, end1, start2, end2) => start1 < end2 && start2 < end1
