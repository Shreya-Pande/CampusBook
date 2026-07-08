export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Returns ['2025-11-10', ..., '2025-11-14'] for the Mon-Fri of the given week
export const getWeekDates = (weekStartDate) => {
  const start = new Date(weekStartDate)
  const dates = []

  for (let i = 0; i < DAY_ORDER.length; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date.toISOString().slice(0, 10))
  }

  return dates
}
