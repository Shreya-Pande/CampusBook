import redis from '../config/redis.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import User from '../models/User.js'
import ActivityLog from '../models/ActivityLog.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { getSunday12PM } from '../utils/timeUtils.js'
import { getCurrentWeekBounds } from '../jobs/portalWindow.cron.js'

export const getStatus = async (req, res) => {
  const status = (await redis.get('portal:status')) || 'closed'
  const window = await WeeklyPortalWindow.findOne({ status: { $in: ['open', 'upcoming'] } }).sort(
    { weekStartDate: -1 },
  )

  const [nextOpen, nextClose] = await Promise.all([
    redis.get('portal:next_open'),
    redis.get('portal:next_close'),
  ])

  return ApiResponse.success(
    res,
    {
      status,
      currentWeek: window
        ? {
            weekStartDate: window.weekStartDate,
            weekEndDate: window.weekEndDate,
            portalOpensAt: window.portalOpensAt,
            portalClosesAt: window.portalClosesAt,
          }
        : null,
      nextOpen,
      nextClose,
    },
    'Portal status fetched',
  )
}

export const getCurrentWeek = async (req, res) => {
  const window = await WeeklyPortalWindow.findOne({
    status: { $in: ['open', 'upcoming', 'closing'] },
  }).sort({ weekStartDate: -1 })

  return ApiResponse.success(res, { window: window || null }, 'Current week fetched')
}

export const overrideOpen = async (req, res) => {
  const { lastSunday, thisMonday, thisFriday } = getCurrentWeekBounds()

  await redis.set('portal:status', 'open')
  await redis.set('portal:next_close', thisFriday.toISOString())

  const window = await WeeklyPortalWindow.findOneAndUpdate(
    { weekStartDate: thisMonday },
    {
      weekStartDate: thisMonday,
      weekEndDate: thisFriday,
      portalOpensAt: lastSunday,
      portalClosesAt: thisFriday,
      status: 'open',
    },
    { upsert: true, returnDocument: 'after' },
  )

  const actor = await User.findById(req.user.id).select('name role adminType')
  await ActivityLog.create({
    actorId: req.user.id,
    actorName: actor?.name,
    actorRole: actor?.adminType || actor?.role,
    action: 'portal_opened',
    description: 'Portal manually opened by super admin (emergency override)',
  })

  return ApiResponse.success(res, { status: 'open', window }, 'Portal opened (emergency override)')
}

export const overrideClose = async (req, res) => {
  await redis.set('portal:status', 'closed')
  await redis.set('portal:next_open', getSunday12PM().toISOString())

  const window = await WeeklyPortalWindow.findOneAndUpdate(
    { status: 'open' },
    { status: 'closing' },
    { returnDocument: 'after' },
  )

  const actor = await User.findById(req.user.id).select('name role adminType')
  await ActivityLog.create({
    actorId: req.user.id,
    actorName: actor?.name,
    actorRole: actor?.adminType || actor?.role,
    action: 'portal_closed',
    description: 'Portal manually closed by super admin (emergency override)',
  })

  return ApiResponse.success(
    res,
    { status: 'closed', window },
    'Portal closed (emergency override)',
  )
}
