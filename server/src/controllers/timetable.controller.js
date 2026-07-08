import mongoose from 'mongoose'
import csv from 'csv-parser'
import { Readable } from 'stream'
import Timetable from '../models/Timetable.js'
import Resource from '../models/Resource.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import redis from '../config/redis.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js'
import { DAY_ORDER, getWeekDates } from '../utils/timeUtils.js'
import { bulkTimetableRowSchema } from '../validators/timetable.validators.js'

// Every timetable write invalidates the Redis availability cache for this
// resource across all dates of the currently open booking week — the
// timetable repeats weekly, so any day of the open week could be affected.
const invalidateResourceCache = async (resourceId) => {
  const window = await WeeklyPortalWindow.findOne({ status: 'open' })
  if (!window) return

  const keys = getWeekDates(window.weekStartDate).map((date) => `avail:${resourceId}:${date}`)
  if (keys.length) await redis.del(...keys)
}

const sortByDayThenTime = (entries) =>
  [...entries].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime)
  })

const parseCsvBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const rows = []
    Readable.from(buffer)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject)
  })

export const getByResource = async (req, res) => {
  const { resourceId } = req.params

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new NotFoundError('Resource not found')
  }

  const entries = await Timetable.find({ resourceId, isActive: true })
  return ApiResponse.success(res, { entries: sortByDayThenTime(entries) }, 'Timetable fetched')
}

export const addEntry = async (req, res) => {
  const { resourceId, dayOfWeek, startTime, endTime } = req.body

  const resource = await Resource.findById(resourceId)
  if (!resource) throw new NotFoundError('Resource not found')

  const conflict = await Timetable.findOne({ resourceId, dayOfWeek, startTime, endTime })
  if (conflict) throw new ConflictError('A timetable entry already exists for this slot')

  const entry = await Timetable.create(req.body)
  await invalidateResourceCache(resourceId)

  return ApiResponse.success(res, { entry }, 'Timetable entry added', 201)
}

export const updateEntry = async (req, res) => {
  const { id } = req.params

  const entry = await Timetable.findByIdAndUpdate(id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!entry) throw new NotFoundError('Timetable entry not found')

  await invalidateResourceCache(entry.resourceId)
  return ApiResponse.success(res, { entry }, 'Timetable entry updated')
}

export const deleteEntry = async (req, res) => {
  const { id } = req.params

  const entry = await Timetable.findByIdAndDelete(id)
  if (!entry) throw new NotFoundError('Timetable entry not found')

  await invalidateResourceCache(entry.resourceId)
  return ApiResponse.success(res, null, 'Timetable entry removed')
}

export const bulkUpload = async (req, res) => {
  if (!req.file) throw new AppError('CSV file is required', 400)

  const rows = await parseCsvBuffer(req.file.buffer)
  const result = { inserted: 0, updated: 0, errors: [] }
  const affectedResourceIds = new Set()

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2 // header is row 1

    const { error, value } = bulkTimetableRowSchema.validate(row, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (error) {
      result.errors.push({
        row: rowNumber,
        message: error.details.map((detail) => detail.message).join('; '),
      })
      continue
    }

    const resource = await Resource.findOne({ name: value.resourceName })
    if (!resource) {
      result.errors.push({ row: rowNumber, message: `Resource not found: ${value.resourceName}` })
      continue
    }

    const { resourceName, section, faculty, ...rest } = value
    const data = {
      ...rest,
      resourceId: resource._id,
      classSection: section,
      facultyName: faculty,
    }

    const matchKey = {
      resourceId: resource._id,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
    }
    const existing = await Timetable.findOne(matchKey)

    await Timetable.findOneAndUpdate(matchKey, data, { upsert: true, setDefaultsOnInsert: true })

    affectedResourceIds.add(resource._id.toString())
    if (existing) {
      result.updated += 1
    } else {
      result.inserted += 1
    }
  }

  for (const resourceId of affectedResourceIds) {
    await invalidateResourceCache(resourceId)
  }

  return ApiResponse.success(res, result, 'Bulk upload processed')
}
