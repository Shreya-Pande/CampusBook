import redis from '../config/redis.js'
import Resource from '../models/Resource.js'
import Timetable from '../models/Timetable.js'
import Booking from '../models/Booking.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import logger from '../utils/logger.js'
import {
  getDayOfWeek,
  getWeekDates,
  generateTimeSlots,
  slotsOverlap,
  startOfDay,
  endOfDay,
} from '../utils/timeUtils.js'

const AVAILABILITY_TTL_SECONDS = 300
const SLOT_START = '08:00'
const SLOT_END = '22:00'
const SLOT_INTERVAL_MINUTES = 60

const cacheKey = (resourceId, dateString) => `avail:${resourceId}:${dateString}`

// Timetable-aware, date-specific slot classification for one resource on one
// date — vacant (bookable instantly), non_vacant (has a scheduled class,
// needs approval), or occupied (already booked). Cached for 5 minutes since
// this is read far more often than the underlying data changes; every
// booking/timetable write that could affect the result explicitly invalidates
// the cache key instead of waiting out the TTL.
export const getResourceAvailability = async (resourceId, dateString) => {
  const key = cacheKey(resourceId, dateString)
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const dayOfWeek = getDayOfWeek(dateString)

  const [timetableSlots, activeBookings] = await Promise.all([
    Timetable.find({ resourceId, dayOfWeek, isActive: true }),
    Booking.find({
      resourceIds: resourceId,
      date: { $gte: startOfDay(dateString), $lt: endOfDay(dateString) },
      status: { $in: ['approved', 'pending'] },
    }),
  ])

  const result = generateTimeSlots(SLOT_START, SLOT_END, SLOT_INTERVAL_MINUTES).map((slot) => {
    const bookingEntry = activeBookings.find((booking) =>
      slotsOverlap(slot.start, slot.end, booking.startTime, booking.endTime),
    )
    if (bookingEntry) {
      return { ...slot, status: 'occupied', bookingId: bookingEntry._id }
    }

    const timetableEntry = timetableSlots.find((entry) =>
      slotsOverlap(slot.start, slot.end, entry.startTime, entry.endTime),
    )
    if (timetableEntry) {
      return {
        ...slot,
        status: 'non_vacant',
        timetableEntry: {
          subject: timetableEntry.subject,
          classSection: timetableEntry.classSection,
          facultyName: timetableEntry.facultyName,
        },
      }
    }

    return { ...slot, status: 'vacant' }
  })

  await redis.setex(key, AVAILABILITY_TTL_SECONDS, JSON.stringify(result))
  return result
}

// Invalidates a single resource/date pair — used after events tied to one
// specific date (booking created/cancelled/approved/rejected).
export const invalidateAvailabilityCache = async (resourceId, dateString) => {
  await redis.del(cacheKey(resourceId, dateString))
}

// Invalidates every date of the currently open booking week for a resource —
// used after events that can affect any day (timetable changes, since the
// timetable repeats weekly; resource status changes like maintenance).
export const invalidateTimetableCache = async (resourceId) => {
  const window = await WeeklyPortalWindow.findOne({ status: 'open' })
  if (!window) return

  const keys = getWeekDates(window.weekStartDate).map((date) => cacheKey(resourceId, date))
  if (keys.length) await redis.del(...keys)
}

// Sunday 11:55 AM pre-generation cron hook — warms the availability cache for
// every active resource across the upcoming Mon-Fri so the Sunday 12:00 PM
// rush reads hit Redis instead of computing on demand under load.
export const prewarmAvailabilityCache = async (weekStartDate, weekEndDate) => {
  const resources = await Resource.find({ status: 'active' }).select('_id')
  const dates = getWeekDates(weekStartDate)

  await Promise.all(
    resources.flatMap((resource) =>
      dates.map((date) => getResourceAvailability(resource._id.toString(), date)),
    ),
  )

  logger.info(
    `Availability cache pre-warmed for ${resources.length} resources across ${dates.length} dates (${weekStartDate.toDateString()} - ${weekEndDate.toDateString()})`,
  )
}
