import { jest } from '@jest/globals'
import mongoose from 'mongoose'
import redis from '../src/config/redis.js'
import { windowGuard } from '../src/middleware/windowGuard.middleware.js'
import WeeklyPortalWindow from '../src/models/WeeklyPortalWindow.js'
import { getNextMonday, getNextFriday, formatLocalDate } from '../src/utils/timeUtils.js'
import { connectTestDB } from './helpers/testConnection.js'

jest.setTimeout(30000)

// Unit-tests the windowGuard middleware directly (mock req/res/next) rather
// than through a specific booking route — the emergency-bypass case is for a
// super admin, a role no booking route's own RBAC would otherwise let past,
// so testing the middleware in isolation is the only way to exercise it
// cleanly. Portal-closed/date-range 403/400s are additionally covered
// end-to-end through the real /instant route in booking.concurrent.test.js.
describe('windowGuard middleware', () => {
  let window
  let weekStartDate
  let weekEndDate

  const buildRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
  }

  beforeAll(async () => {
    await connectTestDB()

    weekStartDate = getNextMonday()
    weekEndDate = getNextFriday(weekStartDate)

    // The test DB is shared across test files in the same run — clear any
    // leftover 'open' window so findOne({status:'open'}) inside windowGuard
    // deterministically resolves to the one this file creates below.
    await WeeklyPortalWindow.deleteMany({ status: 'open' })

    window = await WeeklyPortalWindow.create({
      weekStartDate,
      weekEndDate,
      portalOpensAt: weekStartDate,
      portalClosesAt: weekEndDate,
      status: 'open',
    })
  })

  afterEach(async () => {
    // Restore the baseline "open" status other tests in this file rely on.
    await redis.set('portal:status', 'open')
  })

  afterAll(async () => {
    await WeeklyPortalWindow.findByIdAndDelete(window._id)
    await redis.del('portal:status', 'portal:next_open')
    await mongoose.connection.close()
    await redis.quit()
  })

  it('passes through when the portal is open and the date is within the current week', async () => {
    await redis.set('portal:status', 'open')
    const req = { user: { role: 'cr_faculty' }, body: { date: formatLocalDate(weekStartDate) } }
    const res = buildRes()
    const next = jest.fn()

    await windowGuard(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 with the nextOpen time when the portal is closed', async () => {
    const nextOpenIso = '2026-01-04T12:00:00.000Z'
    await redis.set('portal:status', 'closed')
    await redis.set('portal:next_open', nextOpenIso)

    const req = { user: { role: 'cr_faculty' }, body: {} }
    const res = buildRes()
    const next = jest.fn()

    await windowGuard(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json.mock.calls[0][0].message).toContain(nextOpenIso)
  })

  it('returns 400 for a booking date that falls on Saturday', async () => {
    await redis.set('portal:status', 'open')
    const saturday = new Date(weekStartDate)
    saturday.setDate(saturday.getDate() + 5) // Monday + 5 = Saturday

    const req = { user: { role: 'cr_faculty' }, body: { date: formatLocalDate(saturday) } }
    const res = buildRes()
    const next = jest.fn()

    await windowGuard(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for a date outside the current week', async () => {
    await redis.set('portal:status', 'open')
    const farFuture = new Date(weekStartDate)
    farFuture.setDate(farFuture.getDate() + 21)

    const req = { user: { role: 'cr_faculty' }, body: { date: formatLocalDate(farFuture) } }
    const res = buildRes()
    const next = jest.fn()

    await windowGuard(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('lets a super admin with isEmergency true bypass the closed-portal check', async () => {
    await redis.set('portal:status', 'closed')

    const req = {
      user: { role: 'admin', adminType: 'super_admin' },
      body: { isEmergency: true },
    }
    const res = buildRes()
    const next = jest.fn()

    await windowGuard(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
