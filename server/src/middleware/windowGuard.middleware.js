import redis from '../config/redis.js'
import WeeklyPortalWindow from '../models/WeeklyPortalWindow.js'
import { ApiResponse } from '../utils/apiResponse.js'

// Sits between RBAC and the controller on booking endpoints. Blocks writes
// while the portal is closed and confirms any requested date falls inside
// the currently open Mon-Fri window — except for a super admin's genuine
// emergency requests, which bypass the window entirely.
export const windowGuard = async (req, res, next) => {
  if (req.user?.adminType === 'super_admin' && req.body?.isEmergency) return next()

  const status = await redis.get('portal:status')
  if (status !== 'open') {
    const nextOpen = await redis.get('portal:next_open')
    return ApiResponse.error(res, `Portal closed. Next opening: ${nextOpen}`, 403)
  }

  if (req.body?.date) {
    const window = await WeeklyPortalWindow.findOne({ status: 'open' })
    if (!window) {
      return ApiResponse.error(res, 'No active booking window found', 403)
    }

    const bookingDate = new Date(req.body.date)
    if (bookingDate < window.weekStartDate || bookingDate > window.weekEndDate) {
      return ApiResponse.error(res, 'Date must be within current booking week (Mon–Fri)', 400)
    }
  }

  next()
}

export default windowGuard
