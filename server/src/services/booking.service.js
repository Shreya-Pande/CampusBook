import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import Timetable from '../models/Timetable.js'
import Resource from '../models/Resource.js'
import User from '../models/User.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import ApprovalRouting from '../models/ApprovalRouting.js'
import ActivityLog from '../models/ActivityLog.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { invalidateAvailabilityCache } from './availability.service.js'
import { updateGamification } from './gamification.service.js'
import { canBook } from '../utils/permissions.js'
import { getDayOfWeek, startOfDay, endOfDay, formatLocalDate } from '../utils/timeUtils.js'
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js'

const MAX_TRANSACTION_RETRIES = 5

// Every booking transaction here ends with an $inc on the shared
// WeeklyPortalWindow stats document. When two transactions race on the same
// slot, MongoDB's snapshot isolation aborts one with a WriteConflict/
// TransientTransactionError even after our own application-level conflict
// checks pass for both — that's a normal, expected outcome under concurrent
// load (the Sunday 12PM rush this whole engine is built around), not a bug.
// Retrying re-runs the conflict checks, so the retried attempt sees whichever
// booking committed first and correctly resolves to a clean ConflictError
// instead of leaking a raw 500.
const runInTransaction = async (work) => {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    const session = await mongoose.startSession()
    try {
      session.startTransaction()
      const result = await work(session)
      await session.commitTransaction()
      return result
    } catch (err) {
      await session.abortTransaction()
      const isTransient = err.errorLabelSet?.has?.('TransientTransactionError') ?? false
      if (!isTransient || attempt === MAX_TRANSACTION_RETRIES) throw err
    } finally {
      session.endSession()
    }
  }
  return undefined
}

// Vacant classroom, first-come-first-served — no approval routing involved.
// Vacancy is re-verified INSIDE the transaction (not just trusting the
// caller's cached availability read) to close the TOCTOU window during the
// Sunday 12PM rush, when many users can read "vacant" before either commits.
export const createInstantBooking = async (bookingData, userId) => {
  const { resourceId, date, startTime, endTime, purpose, attendees } = bookingData
  const dateStr = formatLocalDate(new Date(date))

  const booking = await runInTransaction(async (session) => {
    const resource = await Resource.findById(resourceId).session(session)
    if (!resource) throw new NotFoundError('Resource not found')
    // requiresApprovalAlways resources (labs, auditoriums, meeting rooms) can
    // never be instant-booked, regardless of timetable/booking vacancy.
    if (resource.requiresApprovalAlways) {
      throw new ForbiddenError('This resource always requires approval — use the request flow')
    }

    const dayOfWeek = getDayOfWeek(date)

    const [timetableConflict, bookingConflict] = await Promise.all([
      Timetable.findOne({
        resourceId,
        dayOfWeek,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        isActive: true,
      }).session(session),
      Booking.findOne({
        resourceIds: resourceId,
        date: { $gte: startOfDay(date), $lt: endOfDay(date) },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: { $in: ['approved', 'pending'] },
      }).session(session),
    ])

    if (timetableConflict) throw new ConflictError('Slot now non-vacant — use request flow')
    if (bookingConflict) throw new ConflictError('Slot just booked — join waitlist')

    const window = await WeeklyPortalWindow.findOne({ status: 'open' }).session(session)
    if (!window) throw new AppError('No active booking window found', 403)

    const created = await Booking.create(
      [
        {
          portalWindowId: window._id,
          resourceIds: [resourceId],
          userId,
          date: new Date(date),
          dayOfWeek,
          startTime,
          endTime,
          // Booking schema has no top-level purpose/attendees fields (Section 7
          // of the blueprint) — captured under formData instead so the Instant
          // Booking form's input isn't silently dropped by Mongoose's
          // strict-mode create().
          formData: { eventName: purpose, expectedAttendees: attendees },
          bookingType: 'instant',
          status: 'approved',
        },
      ],
      { session },
    )

    await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
      $inc: { 'stats.totalBookingsMade': 1 },
    }).session(session)

    return created[0]
  })

  await invalidateAvailabilityCache(resourceId, dateStr)
  await notificationQueue.add('booking_instant_confirmed', { bookingId: booking._id })
  await updateGamification(userId, 'booking_created')
  return booking
}

// Non-vacant classroom / lab / meeting / conference / auditorium / sports
// court — always requires HOD/dept-admin approval. Routed by department +
// resource type via ApprovalRouting.
export const createApprovalBooking = async (bookingData, formData, userId) => {
  const { resourceId, date, startTime, endTime, isEmergency } = bookingData
  const dateStr = formatLocalDate(new Date(date))

  let routing
  const booking = await runInTransaction(async (session) => {
    const bookingConflict = await Booking.findOne({
      resourceIds: resourceId,
      date: { $gte: startOfDay(date), $lt: endOfDay(date) },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
      status: { $in: ['approved', 'pending'] },
    }).session(session)
    if (bookingConflict) throw new ConflictError('Slot already has active booking/request')

    // Check designation permission
    const [user, resource] = await Promise.all([
      User.findById(userId).session(session),
      Resource.findById(resourceId).session(session),
    ])
    if (!resource) throw new NotFoundError('Resource not found')
    if (!canBook(user.designation, resource.type)) {
      throw new ForbiddenError(`${user.designation} cannot request ${resource.type}`)
    }

    // Routing lookup
    routing = await ApprovalRouting.findOne({
      department: resource.department,
      $or: [{ resourceType: resource.type }, { resourceType: 'all' }],
    }).session(session)
    if (!routing) throw new AppError('No approver configured. Contact super admin.', 500)

    const window = await WeeklyPortalWindow.findOne({ status: 'open' }).session(session)
    if (!window) throw new AppError('No active booking window found', 403)

    const dayOfWeek = getDayOfWeek(date)

    const created = await Booking.create(
      [
        {
          portalWindowId: window._id,
          resourceIds: [resourceId],
          userId,
          date: new Date(date),
          dayOfWeek,
          startTime,
          endTime,
          bookingType: 'approval_required',
          status: 'pending',
          formData,
          assignedApproverId: routing.approverId,
          isEmergency: Boolean(isEmergency),
        },
      ],
      { session },
    )

    await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
      $inc: { 'stats.totalRequests': 1 },
    }).session(session)

    return created[0]
  })

  await invalidateAvailabilityCache(resourceId, dateStr)
  await notificationQueue.add('booking_pending_submitted', { bookingId: booking._id })
  await notificationQueue.add('admin_new_request', {
    bookingId: booking._id,
    approverId: routing.approverId,
  })
  await ActivityLog.create({
    actorId: userId,
    action: 'booking_created',
    targetId: booking._id,
    targetType: 'Booking',
    description: `Approval request submitted for resource ${resourceId}`,
  })
  return booking
}

// Each room processed independently — mixed results possible.
export const createMultiRoomBooking = async (resourceIds, bookingData, formData, userId) => {
  const results = await Promise.allSettled(
    resourceIds.map((id) =>
      createApprovalBooking({ ...bookingData, resourceId: id }, formData, userId),
    ),
  )

  return results.map((result, index) => ({
    resourceId: resourceIds[index],
    status: result.status === 'fulfilled' ? 'submitted' : 'failed',
    bookingId: result.value?._id,
    reason: result.reason?.message,
  }))
}
