import cron from 'node-cron'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import Booking from '../models/Booking.js'
import BookingArchive from '../models/BookingArchive.js'
import Waitlist from '../models/Waitlist.js'
import ActivityLog from '../models/ActivityLog.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { prewarmAvailabilityCache } from '../services/availability.service.js'
import {
  getNextMonday,
  getNextFriday,
  getSunday12PM,
  getSunday1145AM,
  getFriday5PM,
  getCurrentTimeString,
  getTimeString,
  startOfDay,
  endOfDay,
} from '../utils/timeUtils.js'

const groupByApprover = (bookings) => {
  const groups = new Map()
  for (const booking of bookings) {
    const approverId = booking.assignedApproverId?._id?.toString()
    if (!approverId) continue
    if (!groups.has(approverId)) groups.set(approverId, [])
    groups.get(approverId).push(booking)
  }
  return groups
}

const computeWindowStats = async (windowId) => {
  const [totalBookingsMade, totalRequests, approvedRequests, rejectedRequests, expiredRequests] =
    await Promise.all([
      Booking.countDocuments({ portalWindowId: windowId, bookingType: 'instant' }),
      Booking.countDocuments({ portalWindowId: windowId, bookingType: 'approval_required' }),
      Booking.countDocuments({
        portalWindowId: windowId,
        bookingType: 'approval_required',
        status: 'approved',
      }),
      Booking.countDocuments({ portalWindowId: windowId, status: 'rejected' }),
      Booking.countDocuments({ portalWindowId: windowId, status: 'expired' }),
    ])

  return { totalBookingsMade, totalRequests, approvedRequests, rejectedRequests, expiredRequests }
}

// CRON 1: Sunday 11:55 AM — pre-generate next week's window + warm cache
export const preGenerateNextWeek = async () => {
  const nextMon = getNextMonday()
  const nextFri = getNextFriday(nextMon)

  await WeeklyPortalWindow.findOneAndUpdate(
    { weekStartDate: nextMon },
    {
      weekStartDate: nextMon,
      weekEndDate: nextFri,
      portalOpensAt: getSunday12PM(),
      portalClosesAt: getFriday5PM(nextFri),
      roleOpenTimes: { faculty: getSunday1145AM(), cr_faculty: getSunday12PM() },
      status: 'upcoming',
    },
    { upsert: true },
  )

  await prewarmAvailabilityCache(nextMon, nextFri)
  logger.info('Next week portal window pre-generated')
}

// CRON 2: Sunday 12:00 PM — open portal
export const openPortal = async () => {
  const window = await WeeklyPortalWindow.findOneAndUpdate(
    { status: 'upcoming' },
    { status: 'open' },
    { sort: { weekStartDate: 1 }, returnDocument: 'after' },
  )

  await redis.set('portal:status', 'open')
  await redis.set('portal:next_close', getFriday5PM().toISOString())
  await notificationQueue.add('portal_now_open', { type: 'portal_now_open' })
  await ActivityLog.create({ action: 'portal_opened', description: 'Weekly portal opened' })
  logger.info(
    `Portal opened for week starting ${window?.weekStartDate?.toDateString() ?? 'unknown'}`,
  )
}

// CRON 3: Friday 4:55 PM — warn HODs of expiring pending requests
export const sendExpiryWarnings = async () => {
  const pending = await Booking.find({ status: 'pending' }).populate('assignedApproverId')
  const byApprover = groupByApprover(pending)

  for (const [approverId, reqs] of byApprover.entries()) {
    await notificationQueue.add('admin_expiry_warning', {
      approverId,
      count: reqs.length,
      expiresAt: getFriday5PM().toISOString(),
    })
  }
  logger.info(`Expiry warnings sent to ${byApprover.size} admins`)
}

// CRON 4: Friday 5:00 PM — close portal + auto-expire pending bookings
export const closePortalAndExpire = async () => {
  await redis.set('portal:status', 'closed')
  await redis.set('portal:next_open', getSunday12PM().toISOString())

  const window = await WeeklyPortalWindow.findOneAndUpdate(
    { status: 'open' },
    { status: 'closing' },
    { returnDocument: 'after' },
  )

  if (!window) {
    logger.warn('Portal close cron ran but no open window was found')
    return
  }

  await Booking.updateMany(
    { status: 'pending', portalWindowId: window._id },
    { status: 'expired', updatedAt: new Date() },
  )

  const expired = await Booking.find({ status: 'expired', portalWindowId: window._id })
  for (const booking of expired) {
    await notificationQueue.add('booking_expired', {
      bookingId: booking._id,
      userId: booking.userId,
    })
  }

  const stats = await computeWindowStats(window._id)
  await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
    'stats.totalBookingsMade': stats.totalBookingsMade,
    'stats.totalRequests': stats.totalRequests,
    'stats.approvedRequests': stats.approvedRequests,
    'stats.rejectedRequests': stats.rejectedRequests,
    'stats.expiredRequests': stats.expiredRequests,
  })

  await ActivityLog.create({ action: 'portal_closed', description: 'Weekly portal closed' })
  logger.info(`Portal closed. ${expired.length} requests auto-expired.`)
}

// CRON 5: Friday 5:05 PM — archive this week's bookings to BookingArchive
export const archiveWeek = async () => {
  const window = await WeeklyPortalWindow.findOne({ status: 'closing' })
  if (!window) {
    logger.warn('Archive cron ran but no closing window was found')
    return
  }

  const bookings = await Booking.find({ portalWindowId: window._id })

  if (bookings.length > 0) {
    await BookingArchive.insertMany(
      bookings.map((b) => ({
        ...b.toObject(),
        archivedAt: new Date(),
        archiveReason: 'week_closed',
      })),
    )
    await Booking.deleteMany({ portalWindowId: window._id })
  }

  await Waitlist.deleteMany({ portalWindowId: window._id })

  await WeeklyPortalWindow.findByIdAndUpdate(window._id, { status: 'archived' })
  await ActivityLog.create({
    action: 'archive_completed',
    description: `Week ${window.weekStartDate.toDateString()} archived`,
  })
  logger.info(`Archive complete. ${bookings.length} bookings archived.`)
}

// CRON 6: every 15 min — 1-hour booking reminders
export const sendUpcomingReminders = async () => {
  const now = new Date()
  const in60 = new Date(now.getTime() + 60 * 60 * 1000)

  const upcoming = await Booking.find({
    status: 'approved',
    date: { $gte: startOfDay(now), $lt: endOfDay(now) },
    startTime: { $gte: getCurrentTimeString(), $lte: getTimeString(in60) },
    reminderSent: false,
  })

  for (const booking of upcoming) {
    await notificationQueue.add('reminder_1hr', { bookingId: booking._id })
    await Booking.findByIdAndUpdate(booking._id, { reminderSent: true })
  }

  if (upcoming.length) logger.info(`Sent ${upcoming.length} 1-hour booking reminders`)
}

// Boundaries of the current week's Sun 12PM -> Fri 5PM portal window,
// anchored on whichever Sunday most recently started (or is starting) it.
// Shared by initializePortalWindow and the overrideOpen emergency-open
// endpoint so both compute the same week's dates the same way.
export const getCurrentWeekBounds = (from = new Date()) => {
  const lastSunday = new Date(from)
  lastSunday.setDate(from.getDate() - from.getDay())
  lastSunday.setHours(12, 0, 0, 0)

  const thisMonday = startOfDay(new Date(lastSunday))
  thisMonday.setDate(lastSunday.getDate() + 1)

  const fridayRaw = new Date(lastSunday)
  fridayRaw.setDate(lastSunday.getDate() + 5)
  const thisFriday = getFriday5PM(fridayRaw)

  return { lastSunday, thisMonday, thisFriday }
}

const createOpenWindowForCurrentWeek = async (from = new Date()) => {
  const { lastSunday, thisMonday, thisFriday } = getCurrentWeekBounds(from)

  const facultyOpenTime = new Date(lastSunday)
  facultyOpenTime.setMinutes(facultyOpenTime.getMinutes() - 15)

  const window = await WeeklyPortalWindow.create({
    weekStartDate: thisMonday,
    weekEndDate: thisFriday,
    portalOpensAt: lastSunday,
    portalClosesAt: thisFriday,
    roleOpenTimes: {
      faculty: facultyOpenTime,
      cr_faculty: lastSunday,
    },
    status: 'open',
  })

  await redis.set('portal:status', 'open')
  await redis.set('portal:next_close', thisFriday.toISOString())

  return window
}

// Runs once on server startup. A server restart mid-week has no in-memory
// state, so Redis's portal:status key and the DB's 'open' WeeklyPortalWindow
// (normally kept in sync by openPortal/closePortalAndExpire) can both be
// missing even though the portal should currently be open — this rebuilds
// that state from scratch instead of waiting for the next scheduled cron.
export const initializePortalWindow = async () => {
  const now = new Date()
  const cachedStatus = await redis.get('portal:status')

  if (cachedStatus === 'open') {
    const openWindow = await WeeklyPortalWindow.findOne({ status: 'open' })
    if (openWindow) {
      logger.info('Portal window init: Redis already reports open and DB is in sync, nothing to do')
      return
    }

    const window = await createOpenWindowForCurrentWeek(now)
    logger.info(
      `Portal window init: Redis reported open but no open window existed in DB — created window for week starting ${window.weekStartDate.toDateString()}`,
    )
    return
  }

  const openWindow = await WeeklyPortalWindow.findOne({ status: 'open' })
  if (openWindow) {
    await redis.set('portal:status', 'open')
    await redis.set('portal:next_close', openWindow.portalClosesAt.toISOString())
    logger.info(
      `Portal window init: found open window in DB (week starting ${openWindow.weekStartDate.toDateString()}), synced Redis`,
    )
    return
  }

  const { lastSunday, thisFriday } = getCurrentWeekBounds(now)

  if (now >= lastSunday && now <= thisFriday) {
    const window = await createOpenWindowForCurrentWeek(now)
    logger.info(
      `Portal window init: no open window found but current time is within this week's window — created and opened window for week starting ${window.weekStartDate.toDateString()}`,
    )
    return
  }

  const nextOpen = getSunday12PM(now)
  await redis.set('portal:status', 'closed')
  await redis.set('portal:next_open', nextOpen.toISOString())
  logger.info(`Portal window init: outside weekly window, portal closed until ${nextOpen.toDateString()}`)
}

export const startPortalWindowCrons = () => {
  cron.schedule('55 11 * * 0', preGenerateNextWeek) // Sunday 11:55 AM
  cron.schedule('0 12 * * 0', openPortal) // Sunday 12:00 PM
  cron.schedule('55 16 * * 5', sendExpiryWarnings) // Friday 4:55 PM
  cron.schedule('0 17 * * 5', closePortalAndExpire) // Friday 5:00 PM
  cron.schedule('5 17 * * 5', archiveWeek) // Friday 5:05 PM
  cron.schedule('*/15 * * * *', sendUpcomingReminders) // every 15 min

  logger.info('Portal window cron jobs registered (6 jobs)')
}

export default startPortalWindowCrons
