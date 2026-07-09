import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import ApprovalRouting from '../models/ApprovalRouting.js'
import User from '../models/User.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import ActivityLog from '../models/ActivityLog.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js'
import { formatLocalDate } from '../utils/timeUtils.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { invalidateAvailabilityCache } from '../services/availability.service.js'
import { triggerWaitlistCascade } from '../services/waitlist.service.js'

const paginate = (query) => {
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  return { page, limit, skip: (page - 1) * limit }
}

const logActivity = async (req, action, targetId, targetType, description) => {
  const actor = await User.findById(req.user.id).select('name role adminType')
  await ActivityLog.create({
    actorId: req.user.id,
    actorName: actor?.name,
    actorRole: actor?.adminType || actor?.role,
    action,
    targetId,
    targetType,
    description,
  })
}

// Requests — deptFilter narrows non-super-admins to only their own
// assignedApproverId; super admin sees every department's pending queue.
export const getRequests = async (req, res) => {
  const { page, limit, skip } = paginate(req.query)
  const filter = { ...req.deptFilter, status: 'pending' }

  const [requests, total] = await Promise.all([
    Booking.find(filter)
      .populate('resourceIds', 'name type department building floor capacity')
      .populate('userId', 'name email department designation')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ])

  return ApiResponse.success(
    res,
    { requests, page, limit, total, totalPages: Math.ceil(total / limit) },
    'Pending requests fetched',
  )
}

export const getRequestById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Request not found')

  const request = await Booking.findOne({ _id: id, ...req.deptFilter })
    .populate('resourceIds', 'name type department building floor capacity amenities')
    .populate('userId', 'name email department designation')
  if (!request) throw new NotFoundError('Request not found')

  return ApiResponse.success(res, { request }, 'Request fetched')
}

export const approveRequest = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Request not found')

  const booking = await Booking.findOne({ _id: id, ...req.deptFilter })
  if (!booking) throw new NotFoundError('Request not found')
  if (booking.status !== 'pending') throw new ConflictError(`Request already ${booking.status}`)

  booking.status = 'approved'
  booking.approvedBy = req.user.id
  await booking.save()

  await invalidateAvailabilityCache(booking.resourceIds[0], formatLocalDate(booking.date))
  await WeeklyPortalWindow.findByIdAndUpdate(booking.portalWindowId, {
    $inc: { 'stats.approvedRequests': 1 },
  })
  await notificationQueue.add('booking_approved', { bookingId: booking._id })
  await logActivity(req, 'booking_approved', booking._id, 'Booking', 'Request approved')

  return ApiResponse.success(res, { booking }, 'Request approved')
}

export const rejectRequest = async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Request not found')

  const booking = await Booking.findOne({ _id: id, ...req.deptFilter })
  if (!booking) throw new NotFoundError('Request not found')
  if (booking.status !== 'pending') throw new ConflictError(`Request already ${booking.status}`)

  booking.status = 'rejected'
  booking.rejectedBy = req.user.id
  booking.rejectionReason = reason
  await booking.save()

  await WeeklyPortalWindow.findByIdAndUpdate(booking.portalWindowId, {
    $inc: { 'stats.rejectedRequests': 1 },
  })
  await invalidateAvailabilityCache(booking.resourceIds[0], formatLocalDate(booking.date))
  // Slot is free again now that the request was rejected
  await triggerWaitlistCascade({
    resourceId: booking.resourceIds[0],
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
  })
  await notificationQueue.add('booking_rejected', { bookingId: booking._id, reason })
  await logActivity(req, 'booking_rejected', booking._id, 'Booking', `Request rejected: ${reason}`)

  return ApiResponse.success(res, { booking }, 'Request rejected')
}

// Routing config — super admin only
export const getRoutingConfig = async (req, res) => {
  const rules = await ApprovalRouting.find()
    .populate('approverId', 'name email department adminType')
    .populate('configuredBy', 'name email')
    .sort({ department: 1 })

  return ApiResponse.success(res, { rules }, 'Routing config fetched')
}

export const createRoutingRule = async (req, res) => {
  const { department, resourceType, bookingType, approverId } = req.body

  const approver = await User.findById(approverId)
  if (!approver) throw new NotFoundError('Approver not found')

  // A duplicate rule would make the routing lookup in booking.service.js
  // resolve to whichever row Mongo happens to return first — reject it here
  // instead of letting that ambiguity reach booking creation.
  const existing = await ApprovalRouting.findOne({ department, resourceType, bookingType })
  if (existing) throw new ConflictError('A routing rule already exists for this combination')

  const rule = await ApprovalRouting.create({
    department,
    resourceType,
    bookingType,
    approverId,
    configuredBy: req.user.id,
  })

  return ApiResponse.success(res, { rule }, 'Routing rule created', 201)
}

export const updateRoutingRule = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Routing rule not found')

  if (req.body.approverId) {
    const approver = await User.findById(req.body.approverId)
    if (!approver) throw new NotFoundError('Approver not found')
  }

  const rule = await ApprovalRouting.findByIdAndUpdate(
    id,
    { ...req.body, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true },
  )
  if (!rule) throw new NotFoundError('Routing rule not found')

  return ApiResponse.success(res, { rule }, 'Routing rule updated')
}

// User management — super admin only
export const getAllUsers = async (req, res) => {
  const { role, adminType, department, isApproved } = req.query
  const { page, limit, skip } = paginate(req.query)

  const filter = {}
  if (role) filter.role = role
  if (adminType) filter.adminType = adminType
  if (department) filter.department = department
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true'

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ])

  return ApiResponse.success(
    res,
    { users, page, limit, total, totalPages: Math.ceil(total / limit) },
    'Users fetched',
  )
}

export const approveAdminAccount = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('User not found')

  const user = await User.findById(id)
  if (!user) throw new NotFoundError('User not found')
  if (user.role !== 'admin') throw new AppError('Only admin accounts require approval', 400)
  if (user.isApproved) throw new ConflictError('Account already approved')

  user.isApproved = true
  await user.save()

  return ApiResponse.success(res, { user }, 'Admin account approved')
}

export const updateUserRole = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('User not found')

  const user = await User.findByIdAndUpdate(id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!user) throw new NotFoundError('User not found')

  return ApiResponse.success(res, { user }, 'User updated')
}

// Analytics + activity
export const getAnalyticsOverview = async (req, res) => {
  return ApiResponse.success(
    res,
    { note: 'Full analytics aggregations ship in Phase 9 — this endpoint is a placeholder.' },
    'Analytics overview (stub)',
  )
}

export const getActivityLog = async (req, res) => {
  const { page, limit, skip } = paginate(req.query)

  const [entries, total] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(),
  ])

  return ApiResponse.success(
    res,
    { entries, page, limit, total, totalPages: Math.ceil(total / limit) },
    'Activity log fetched',
  )
}
