import mongoose from 'mongoose'
import Resource from '../models/Resource.js'
import Timetable from '../models/Timetable.js'
import BookingArchive from '../models/BookingArchive.js'
import User from '../models/User.js'
import ActivityLog from '../models/ActivityLog.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { AppError, NotFoundError } from '../utils/errors.js'
import { DAY_ORDER } from '../utils/timeUtils.js'
import {
  getResourceAvailability,
  invalidateTimetableCache,
} from '../services/availability.service.js'

const sortByDayThenTime = (entries) =>
  [...entries].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime)
  })

const logActivity = async (req, action, resource, description) => {
  const actor = await User.findById(req.user.id).select('name role adminType')
  await ActivityLog.create({
    actorId: req.user.id,
    actorName: actor?.name,
    actorRole: actor?.adminType || actor?.role,
    action,
    targetId: resource._id,
    targetType: 'Resource',
    description,
  })
}

export const getAllResources = async (req, res) => {
  const { department, building, type, capacity, amenities, date, status } = req.query

  const filter = {}
  if (department) filter.department = department
  if (building) filter.building = building
  if (type) filter.type = type
  if (capacity) filter.capacity = { $gte: Number(capacity) }
  if (amenities) {
    const list = amenities
      .split(',')
      .map((amenity) => amenity.trim())
      .filter(Boolean)
    if (list.length) filter.amenities = { $all: list }
  }

  let resources = await Resource.find(filter).sort({ name: 1 })

  // Availability filter — only meaningful alongside a target date + slot
  // status (vacant/non_vacant/occupied); keeps resources with at least one
  // matching slot on that date.
  if (date && status) {
    const matches = await Promise.all(
      resources.map(async (resource) => {
        const slots = await getResourceAvailability(resource._id.toString(), date)
        return slots.some((slot) => slot.status === status)
      }),
    )
    resources = resources.filter((_, index) => matches[index])
  }

  return ApiResponse.success(res, { resources, count: resources.length }, 'Resources fetched')
}

export const getTrending = async (req, res) => {
  const limit = Number(req.query.limit) || 5
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const trending = await BookingArchive.aggregate([
    { $match: { archivedAt: { $gte: since } } },
    { $unwind: '$resourceIds' },
    { $group: { _id: '$resourceIds', bookingCount: { $sum: 1 } } },
    { $sort: { bookingCount: -1 } },
    { $limit: limit },
  ])

  const resources = await Resource.find({ _id: { $in: trending.map((entry) => entry._id) } })
  const resourceById = new Map(resources.map((resource) => [resource._id.toString(), resource]))

  const results = trending
    .map((entry) => ({
      resource: resourceById.get(entry._id.toString()),
      bookingCount: entry.bookingCount,
    }))
    .filter((entry) => entry.resource)

  return ApiResponse.success(res, { trending: results }, 'Trending resources fetched')
}

export const getResourceById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Resource not found')

  const resource = await Resource.findById(id)
  if (!resource) throw new NotFoundError('Resource not found')

  return ApiResponse.success(res, { resource }, 'Resource fetched')
}

export const getAvailability = async (req, res) => {
  const { id } = req.params
  const { date } = req.query

  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Resource not found')
  if (!date) throw new AppError('date query parameter is required (YYYY-MM-DD)', 400)

  const resource = await Resource.findById(id)
  if (!resource) throw new NotFoundError('Resource not found')

  const slots = await getResourceAvailability(id, date)
  return ApiResponse.success(res, { resourceId: id, date, slots }, 'Availability fetched')
}

export const getTimetable = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Resource not found')

  const resource = await Resource.findById(id)
  if (!resource) throw new NotFoundError('Resource not found')

  const entries = await Timetable.find({ resourceId: id, isActive: true })
  return ApiResponse.success(res, { entries: sortByDayThenTime(entries) }, 'Timetable fetched')
}

export const createResource = async (req, res) => {
  const resource = await Resource.create({ ...req.body, createdBy: req.user.id })
  await logActivity(req, 'resource_added', resource, `Resource created: ${resource.name}`)

  return ApiResponse.success(res, { resource }, 'Resource created', 201)
}

export const updateResource = async (req, res) => {
  const { id } = req.params

  const resource = await Resource.findByIdAndUpdate(id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!resource) throw new NotFoundError('Resource not found')

  await invalidateTimetableCache(id)
  await logActivity(req, 'resource_updated', resource, `Resource updated: ${resource.name}`)

  return ApiResponse.success(res, { resource }, 'Resource updated')
}

export const setResourceStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const resource = await Resource.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: 'after', runValidators: true },
  )
  if (!resource) throw new NotFoundError('Resource not found')

  await invalidateTimetableCache(id)
  await logActivity(
    req,
    'resource_updated',
    resource,
    `Resource status set to ${status}: ${resource.name}`,
  )

  return ApiResponse.success(res, { resource }, 'Resource status updated')
}

export const saveResource = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Resource not found')

  const resource = await Resource.findById(id)
  if (!resource) throw new NotFoundError('Resource not found')

  const user = await User.findById(req.user.id)
  const isSaved = user.savedResources.some((savedId) => savedId.toString() === id)

  if (isSaved) {
    user.savedResources = user.savedResources.filter((savedId) => savedId.toString() !== id)
  } else {
    user.savedResources.push(id)
  }
  await user.save()

  return ApiResponse.success(
    res,
    { saved: !isSaved, savedResources: user.savedResources },
    isSaved ? 'Resource removed from saved' : 'Resource saved',
  )
}
