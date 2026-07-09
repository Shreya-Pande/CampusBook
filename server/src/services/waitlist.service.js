import Waitlist from '../models/Waitlist.js'
import Booking from '../models/Booking.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import logger from '../utils/logger.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { invalidateAvailabilityCache } from './availability.service.js'
import { updateGamification } from './gamification.service.js'
import { getDayOfWeek, startOfDay, endOfDay, formatLocalDate } from '../utils/timeUtils.js'
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js'

const OFFER_WINDOW_MS = 15 * 60 * 1000

const dateRange = (date) => ({ $gte: startOfDay(date), $lt: endOfDay(date) })

// Only an already-occupied slot (an active booking sitting on it) is
// eligible for a waitlist join — vacant/non-vacant slots should be booked
// directly instead, per the Booking Decision Matrix (Section 2).
export const joinWaitlist = async ({ resourceId, date, startTime, endTime }, userId) => {
  const occupied = await Booking.findOne({
    resourceIds: resourceId,
    date: dateRange(date),
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    status: { $in: ['approved', 'pending'] },
  })
  if (!occupied) throw new ConflictError('Slot is not occupied — book it directly instead')

  const window = await WeeklyPortalWindow.findOne({ status: 'open' })
  if (!window) throw new AppError('No active booking window found', 403)

  const existing = await Waitlist.findOne({
    resourceId,
    date: dateRange(date),
    startTime,
    endTime,
    userId,
    status: { $in: ['waiting', 'offered'] },
  })
  if (existing) throw new ConflictError('You are already on the waitlist for this slot')

  const position =
    (await Waitlist.countDocuments({
      resourceId,
      date: dateRange(date),
      startTime,
      endTime,
      status: { $in: ['waiting', 'offered'] },
    })) + 1

  return Waitlist.create({
    resourceId,
    date: new Date(date),
    startTime,
    endTime,
    userId,
    position,
    status: 'waiting',
    portalWindowId: window._id,
  })
}

// Called whenever a slot frees up (booking cancelled/rejected, or an offered
// waitlist entry itself expiring) — offers the slot to whoever is first in
// line with a 15-minute window to claim it.
export const triggerWaitlistCascade = async ({ resourceId, date, startTime, endTime }) => {
  const next = await Waitlist.findOneAndUpdate(
    {
      resourceId,
      date: dateRange(date),
      startTime,
      endTime,
      status: 'waiting',
    },
    { status: 'offered', offerExpiresAt: new Date(Date.now() + OFFER_WINDOW_MS) },
    { sort: { position: 1 }, returnDocument: 'after' },
  )

  if (!next) {
    logger.info(`No waitlist entries to cascade for resource ${resourceId}`)
    return null
  }

  await notificationQueue.add('waitlist_offered', { waitlistId: next._id, userId: next.userId })
  return next
}

// Confirms a held offer — creates the booking directly (the offer itself is
// the guarantee; no further approval/permission checks apply) and marks the
// waitlist entry confirmed.
export const confirmWaitlistOffer = async (waitlistId, userId) => {
  const waitlist = await Waitlist.findById(waitlistId)
  if (!waitlist) throw new NotFoundError('Waitlist entry not found')
  if (waitlist.userId.toString() !== userId) {
    throw new ForbiddenError('This offer does not belong to you')
  }
  if (waitlist.status !== 'offered') {
    throw new ConflictError(`This offer is ${waitlist.status}, not available to confirm`)
  }
  if (waitlist.offerExpiresAt < new Date()) {
    throw new ConflictError('This offer has expired')
  }

  const conflict = await Booking.findOne({
    resourceIds: waitlist.resourceId,
    date: dateRange(waitlist.date),
    startTime: { $lt: waitlist.endTime },
    endTime: { $gt: waitlist.startTime },
    status: { $in: ['approved', 'pending'] },
  })
  if (conflict) throw new ConflictError('Slot is no longer available')

  const window = await WeeklyPortalWindow.findOne({ status: 'open' })
  if (!window) throw new AppError('No active booking window found', 403)

  const [booking] = await Booking.create([
    {
      portalWindowId: window._id,
      resourceIds: [waitlist.resourceId],
      userId,
      date: waitlist.date,
      dayOfWeek: getDayOfWeek(waitlist.date),
      startTime: waitlist.startTime,
      endTime: waitlist.endTime,
      formData: { eventName: 'Waitlist confirmation' },
      bookingType: 'instant',
      status: 'approved',
    },
  ])

  await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
    $inc: { 'stats.totalBookingsMade': 1 },
  })

  waitlist.status = 'confirmed'
  await waitlist.save()

  await invalidateAvailabilityCache(waitlist.resourceId, formatLocalDate(waitlist.date))
  await notificationQueue.add('booking_instant_confirmed', { bookingId: booking._id })
  await updateGamification(userId, 'booking_created')

  return booking
}

export default { joinWaitlist, triggerWaitlistCascade, confirmWaitlistOffer }
