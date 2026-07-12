import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import BookingArchive from '../models/BookingArchive.js'
import ApprovalRouting from '../models/ApprovalRouting.js'
import User from '../models/User.js'
import Resource from '../models/Resource.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import ActivityLog from '../models/ActivityLog.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js'
import { formatLocalDate, startOfDay, endOfDay } from '../utils/timeUtils.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { invalidateAvailabilityCache } from '../services/availability.service.js'
import { triggerWaitlistCascade } from '../services/waitlist.service.js'

const paginate = (query) => {
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  return { page, limit, skip: (page - 1) * limit }
}

// Analytics helpers — every metric below reads current-week data from
// Booking unioned with all-time historical data from BookingArchive, per
// Phase 9 spec, then optionally scopes to the requesting admin's own
// department (super admin sees everything unscoped).
const BOOKABLE_HOURS_PER_DAY = 14 // 08:00–22:00, matching availability.service.js's slot window
const UTILIZATION_WINDOW_DAYS = 30

const unionWithArchive = { $unionWith: { coll: BookingArchive.collection.name, pipeline: [] } }

const departmentScopeOf = (req) => (req.user.adminType === 'super_admin' ? null : req.user.department)

// Optional ?period= support for the analytics KPI row / charts (This Week /
// 30 Days / 90 Days tabs) — "week" is a trailing 7-day window rather than a
// calendar Mon-Sun week, for consistency with the 30d/90d windows. Absent or
// unrecognized period leaves the existing all-time behavior unchanged.
const PERIOD_DAYS = { week: 7, '30d': 30, '90d': 90 }
const periodSince = (period) => {
  const days = PERIOD_DAYS[period]
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null
}

// Plain document-count filter (no resourceIds unwind) — a multi-room booking
// counts once here regardless of how many of its rooms belong to the dept.
const deptBookingFilter = async (deptScope) => {
  if (!deptScope) return {}
  const resourceIds = await Resource.find({ department: deptScope }).distinct('_id')
  return { resourceIds: { $in: resourceIds } }
}

// Per-resource join, for metrics that are inherently resource/department
// attributed (utilization, peak hours, department breakdown) — a multi-room
// booking is correctly counted once per resource/department it touches.
const resourceJoinStages = (deptScope) => [
  { $unwind: '$resourceIds' },
  {
    $lookup: {
      from: Resource.collection.name,
      localField: 'resourceIds',
      foreignField: '_id',
      as: 'resource',
    },
  },
  { $unwind: '$resource' },
  ...(deptScope ? [{ $match: { 'resource.department': deptScope } }] : []),
]

// "09:00" -> 540 (minutes since midnight), expressed as a Mongo aggregation
// expression so slot duration can be computed inside the pipeline.
const minutesExpr = (field) => ({
  $add: [
    { $multiply: [{ $toInt: { $substrCP: [field, 0, 2] } }, 60] },
    { $toInt: { $substrCP: [field, 3, 2] } },
  ],
})

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
  const { status } = req.query
  // Default (no status param) preserves the original pending-only behavior
  // relied on by the dashboard KPI card; 'all' opts out of the status filter
  // entirely so the requests page's status tabs can show the full history.
  const filter = { ...req.deptFilter, ...(status && status !== 'all' ? { status } : status ? {} : { status: 'pending' }) }

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

export const deleteRoutingRule = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Routing rule not found')

  const rule = await ApprovalRouting.findByIdAndDelete(id)
  if (!rule) throw new NotFoundError('Routing rule not found')

  return ApiResponse.success(res, null, 'Routing rule deleted')
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

// Analytics
export const getAnalyticsOverview = async (req, res) => {
  const deptScope = departmentScopeOf(req)
  const since = periodSince(req.query.period)
  const matchStage = { ...(await deptBookingFilter(deptScope)), ...(since ? { date: { $gte: since } } : {}) }
  const resourceFilter = deptScope ? { department: deptScope } : {}
  const today = new Date()

  const [result, todayBookings, totalResources, totalUsers] = await Promise.all([
    Booking.aggregate([
      unionWithArchive,
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        },
      },
    ]).then((rows) => rows[0]),
    // "Today" only ever falls within the currently open week, so the live
    // Booking collection alone (no archive union) is the correct source.
    Booking.countDocuments({
      ...matchStage,
      date: { $gte: startOfDay(today), $lt: endOfDay(today) },
      status: { $in: ['approved', 'pending'] },
    }),
    Resource.countDocuments(resourceFilter),
    // Only meaningful platform-wide — a HOD/dept admin has no visibility into
    // other departments' users, so this stays null for them rather than
    // silently showing a scoped (and misleadingly labeled) count.
    req.user.adminType === 'super_admin' ? User.countDocuments({ role: 'cr_faculty' }) : null,
  ])

  const byStatus = Object.fromEntries((result?.byStatus || []).map((s) => [s._id, s.count]))
  const totalBookings = result?.total?.[0]?.count || 0
  const approved = byStatus.approved || 0
  const rejected = byStatus.rejected || 0
  const cancelled = byStatus.cancelled || 0
  const decided = approved + rejected

  return ApiResponse.success(
    res,
    {
      totalBookings,
      byStatus,
      approvalRate: decided ? Number(((approved / decided) * 100).toFixed(1)) : 0,
      cancellationRate: totalBookings ? Number(((cancelled / totalBookings) * 100).toFixed(1)) : 0,
      pendingRequests: byStatus.pending || 0,
      todayBookings,
      totalResources,
      totalUsers,
    },
    'Analytics overview fetched',
  )
}

export const getUtilization = async (req, res) => {
  const deptScope = departmentScopeOf(req)
  const since = new Date(Date.now() - UTILIZATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const utilization = await Booking.aggregate([
    unionWithArchive,
    { $match: { status: { $in: ['approved', 'completed'] }, date: { $gte: since } } },
    ...resourceJoinStages(deptScope),
    {
      $addFields: {
        bookedHours: {
          $divide: [{ $subtract: [minutesExpr('$endTime'), minutesExpr('$startTime')] }, 60],
        },
      },
    },
    {
      $group: {
        _id: '$resourceIds',
        resourceName: { $first: '$resource.name' },
        department: { $first: '$resource.department' },
        totalBookings: { $sum: 1 },
        bookedHours: { $sum: '$bookedHours' },
      },
    },
    {
      $project: {
        _id: 0,
        resourceId: '$_id',
        resourceName: 1,
        department: 1,
        totalBookings: 1,
        bookedHours: { $round: ['$bookedHours', 1] },
        utilizationRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$bookedHours', UTILIZATION_WINDOW_DAYS * BOOKABLE_HOURS_PER_DAY] },
                100,
              ],
            },
            1,
          ],
        },
      },
    },
    { $sort: { utilizationRate: -1 } },
  ])

  return ApiResponse.success(
    res,
    { windowDays: UTILIZATION_WINDOW_DAYS, utilization },
    'Utilization fetched',
  )
}

export const getPeakHours = async (req, res) => {
  const deptScope = departmentScopeOf(req)
  const since = periodSince(req.query.period)

  const raw = await Booking.aggregate([
    unionWithArchive,
    { $match: { status: { $in: ['approved', 'completed'] }, ...(since ? { date: { $gte: since } } : {}) } },
    ...resourceJoinStages(deptScope),
    {
      $group: {
        _id: { dayOfWeek: '$dayOfWeek', hour: { $substrCP: ['$startTime', 0, 2] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
  ])

  const heatmap = raw.map((r) => ({
    dayOfWeek: r._id.dayOfWeek,
    hour: `${r._id.hour}:00`,
    count: r.count,
  }))

  return ApiResponse.success(res, { heatmap }, 'Peak hours fetched')
}

export const getDepartmentBreakdown = async (req, res) => {
  const deptScope = departmentScopeOf(req)
  const since = periodSince(req.query.period)

  const departments = await Booking.aggregate([
    unionWithArchive,
    ...(since ? [{ $match: { date: { $gte: since } } }] : []),
    ...resourceJoinStages(deptScope),
    {
      $group: {
        _id: '$resource.department',
        totalBookings: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, department: '$_id', totalBookings: 1, approved: 1, rejected: 1, cancelled: 1 } },
    { $sort: { totalBookings: -1 } },
  ])

  return ApiResponse.success(res, { departments }, 'Department breakdown fetched')
}

export const getPortalRush = async (req, res) => {
  const rush = await WeeklyPortalWindow.aggregate([
    {
      $project: {
        weekStartDate: 1,
        'stats.bookingsInFirst30Min': 1,
        'stats.totalBookingsMade': 1,
        rushRatio: {
          $divide: ['$stats.bookingsInFirst30Min', { $max: ['$stats.totalBookingsMade', 1] }],
        },
      },
    },
    { $sort: { weekStartDate: -1 } },
    { $limit: 12 },
  ])

  return ApiResponse.success(res, { rush }, 'Portal rush analysis fetched')
}

export const getHodResponseTime = async (req, res) => {
  const matchApprover =
    req.user.adminType === 'super_admin'
      ? {}
      : { assignedApproverId: new mongoose.Types.ObjectId(req.user.id) }

  const results = await Booking.aggregate([
    unionWithArchive,
    {
      $match: {
        status: { $in: ['approved', 'rejected'] },
        bookingType: 'approval_required',
        ...matchApprover,
      },
    },
    {
      $group: {
        _id: '$assignedApproverId',
        avgResponseHours: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600000] } },
        decisionsCount: { $sum: 1 },
      },
    },
    { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'approver' } },
    { $unwind: '$approver' },
    {
      $project: {
        _id: 0,
        approverId: '$_id',
        approverName: '$approver.name',
        department: '$approver.department',
        avgResponseHours: { $round: ['$avgResponseHours', 2] },
        decisionsCount: 1,
      },
    },
    { $sort: { avgResponseHours: 1 } },
  ])

  return ApiResponse.success(res, { results }, 'HOD response time fetched')
}

// Activity
export const getActivityLog = async (req, res) => {
  const { action, from, to } = req.query
  const { page, limit, skip } = paginate(req.query)

  const filter = {}
  if (action) filter.action = action
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
  }

  const [entries, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ])

  return ApiResponse.success(
    res,
    { entries, page, limit, total, totalPages: Math.ceil(total / limit) },
    'Activity log fetched',
  )
}
