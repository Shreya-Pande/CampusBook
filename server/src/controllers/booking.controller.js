import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import BookingArchive from '../models/BookingArchive.js'
import ActivityLog from '../models/ActivityLog.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js'
import { formatLocalDate } from '../utils/timeUtils.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { invalidateAvailabilityCache } from '../services/availability.service.js'
import { triggerWaitlistCascade } from '../services/waitlist.service.js'
import * as bookingService from '../services/booking.service.js'

const NON_CANCELLABLE_STATUSES = ['cancelled', 'rejected', 'expired', 'completed', 'archived']

export const createInstant = async (req, res) => {
  const { resourceId, date, startTime, endTime, purpose, attendees } = req.body

  const booking = await bookingService.createInstantBooking(
    { resourceId, date, startTime, endTime, purpose, attendees },
    req.user.id,
  )

  return ApiResponse.success(res, { booking }, 'Booking confirmed', 201)
}

export const createRequest = async (req, res) => {
  const { resourceId, date, startTime, endTime, formData, isEmergency } = req.body

  const booking = await bookingService.createApprovalBooking(
    { resourceId, date, startTime, endTime, isEmergency },
    formData,
    req.user.id,
  )

  return ApiResponse.success(res, { booking }, 'Request submitted', 201)
}

export const createMultiRoom = async (req, res) => {
  const { resourceIds, date, startTime, endTime, formData, isEmergency } = req.body

  const results = await bookingService.createMultiRoomBooking(
    resourceIds,
    { date, startTime, endTime, isEmergency },
    formData,
    req.user.id,
  )

  return ApiResponse.success(res, { results }, 'Multi-room booking processed')
}

export const getMyBookings = async (req, res) => {
  const { status } = req.query

  const filter = { userId: req.user.id }
  if (status) filter.status = status

  const bookings = await Booking.find(filter)
    .populate('resourceIds', 'name type department building floor')
    .populate('assignedApproverId', 'name')
    .sort({ date: 1, startTime: 1 })
  return ApiResponse.success(res, { bookings }, 'Bookings fetched')
}

export const getMyAllBookings = async (req, res) => {
  const [current, archived] = await Promise.all([
    Booking.find({ userId: req.user.id })
      .populate('resourceIds', 'name type department building floor')
      .populate('assignedApproverId', 'name')
      .sort({ date: -1 }),
    BookingArchive.find({ userId: req.user.id })
      .populate('resourceIds', 'name type department building floor')
      .populate('assignedApproverId', 'name')
      .sort({ date: -1 }),
  ])

  return ApiResponse.success(res, { current, archived }, 'All bookings fetched')
}

export const getBookingById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Booking not found')

  const booking = (await Booking.findById(id)) || (await BookingArchive.findById(id))
  if (!booking) throw new NotFoundError('Booking not found')
  if (booking.userId.toString() !== req.user.id) {
    throw new ForbiddenError('You can only view your own bookings')
  }

  return ApiResponse.success(res, { booking }, 'Booking fetched')
}

export const cancelBooking = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Booking not found')

  const booking = await Booking.findById(id)
  if (!booking) throw new NotFoundError('Booking not found')
  if (booking.userId.toString() !== req.user.id) {
    throw new ForbiddenError('You can only cancel your own booking')
  }
  if (NON_CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new ConflictError(`Booking already ${booking.status}`)
  }

  booking.status = 'cancelled'
  await booking.save()

  await invalidateAvailabilityCache(booking.resourceIds[0], formatLocalDate(booking.date))
  await triggerWaitlistCascade({
    resourceId: booking.resourceIds[0],
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
  })
  await notificationQueue.add('booking_cancelled', { bookingId: booking._id })
  await ActivityLog.create({
    actorId: req.user.id,
    action: 'booking_cancelled',
    targetId: booking._id,
    targetType: 'Booking',
    description: 'Booking cancelled by user',
  })

  return ApiResponse.success(res, { booking }, 'Booking cancelled')
}
