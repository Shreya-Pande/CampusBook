import { jest } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import app from '../src/app.js'
import redis from '../src/config/redis.js'
import { env } from '../src/config/env.js'
import User from '../src/models/User.js'
import Resource from '../src/models/Resource.js'
import Booking from '../src/models/Booking.js'
import Timetable from '../src/models/Timetable.js'
import WeeklyPortalWindow from '../src/models/WeeklyPortalWindow.js'
import { getNextMonday, getNextFriday, formatLocalDate, getDayOfWeek } from '../src/utils/timeUtils.js'
import { connectTestDB } from './helpers/testConnection.js'

jest.setTimeout(30000)

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      adminType: user.adminType,
      department: user.department,
      designation: user.designation,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry },
  )

describe('Booking Engine — concurrent instant booking', () => {
  let resource
  let window
  let user1
  let user2
  let token1
  let token2
  let testDate

  beforeAll(async () => {
    await connectTestDB()

    // The test DB is shared across test files in the same run — clear any
    // leftover 'open' window so findOne({status:'open'}) in the booking
    // service deterministically resolves to the one this file creates below.
    await WeeklyPortalWindow.deleteMany({ status: 'open' })

    resource = await Resource.create({
      name: `Concurrency Test Room ${Date.now()}`,
      type: 'classroom',
      department: 'CSE',
      capacity: 30,
      requiresApprovalAlways: false,
      status: 'active',
    })

    // No timetable entries are seeded for this resource, so this slot is
    // vacant for the entire open week — any weekday works.
    const weekStartDate = getNextMonday()
    const weekEndDate = getNextFriday(weekStartDate)
    testDate = formatLocalDate(weekStartDate)

    window = await WeeklyPortalWindow.create({
      weekStartDate,
      weekEndDate,
      portalOpensAt: weekStartDate,
      portalClosesAt: weekEndDate,
      status: 'open',
    })

    await redis.set('portal:status', 'open')

    const suffix = Date.now()
    ;[user1, user2] = await Promise.all([
      User.create({
        name: 'Concurrent User 1',
        email: `concurrent1.${suffix}@college.edu`,
        password: 'Password@123',
        role: 'cr_faculty',
        department: 'CSE',
        designation: 'CR',
        isApproved: true,
      }),
      User.create({
        name: 'Concurrent User 2',
        email: `concurrent2.${suffix}@college.edu`,
        password: 'Password@123',
        role: 'cr_faculty',
        department: 'CSE',
        designation: 'CR',
        isApproved: true,
      }),
    ])

    token1 = signAccessToken(user1)
    token2 = signAccessToken(user2)
  })

  afterAll(async () => {
    await Booking.deleteMany({ resourceIds: resource._id })
    await Resource.findByIdAndDelete(resource._id)
    await User.deleteMany({ _id: { $in: [user1._id, user2._id] } })
    await WeeklyPortalWindow.findByIdAndDelete(window._id)
    await redis.del(`avail:${resource._id}:${testDate}`)

    await mongoose.connection.close()
    await redis.quit()
  })

  it('only one booking wins when two users book the same slot simultaneously', async () => {
    const payload = {
      resourceId: resource._id.toString(),
      date: testDate,
      startTime: '10:00',
      endTime: '11:00',
      purpose: 'Concurrency test',
    }

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token1}`)
        .send(payload),
      request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token2}`)
        .send(payload),
    ])

    expect([res1.status, res2.status].sort()).toEqual([201, 409])

    const bookings = await Booking.find({ resourceIds: resource._id })
    expect(bookings).toHaveLength(1)
    expect(bookings[0].status).toBe('approved')
  })

  describe('Additional booking engine behaviors', () => {
    const extraResourceIds = []
    const extraTimetableIds = []
    const extraBookingIds = []

    afterEach(async () => {
      // Every portal-status-mutating test restores 'open' so later tests
      // (and the outer describe's own fixtures) see the expected baseline.
      await redis.set('portal:status', 'open')
    })

    afterAll(async () => {
      await Booking.deleteMany({ _id: { $in: extraBookingIds } })
      await Timetable.deleteMany({ _id: { $in: extraTimetableIds } })
      await Resource.deleteMany({ _id: { $in: extraResourceIds } })
    })

    it('POST /api/bookings/instant with portal closed returns 403', async () => {
      await redis.set('portal:status', 'closed')

      const res = await request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: resource._id.toString(),
          date: testDate,
          startTime: '12:00',
          endTime: '13:00',
          purpose: 'Portal closed test',
        })

      expect(res.status).toBe(403)
    })

    it('POST /api/bookings/instant with a date outside the current week returns 400', async () => {
      const farFuture = new Date(window.weekStartDate)
      farFuture.setDate(farFuture.getDate() + 21)

      const res = await request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: resource._id.toString(),
          date: formatLocalDate(farFuture),
          startTime: '12:00',
          endTime: '13:00',
          purpose: 'Out of week test',
        })

      expect(res.status).toBe(400)
    })

    it('POST /api/bookings/instant on a non-vacant slot returns 409 and suggests the request flow', async () => {
      const nonVacantResource = await Resource.create({
        name: `Non-Vacant Test Room ${Date.now()}`,
        type: 'classroom',
        department: 'CSE',
        capacity: 30,
        requiresApprovalAlways: false,
        status: 'active',
      })
      extraResourceIds.push(nonVacantResource._id)

      const timetableEntry = await Timetable.create({
        resourceId: nonVacantResource._id,
        dayOfWeek: getDayOfWeek(testDate),
        startTime: '09:00',
        endTime: '10:00',
        subject: 'Discrete Maths',
        classSection: 'CSE-2B',
        facultyName: 'Dr. Iyer',
        semester: 3,
        academicYear: '2025-26',
        isActive: true,
      })
      extraTimetableIds.push(timetableEntry._id)

      const res = await request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: nonVacantResource._id.toString(),
          date: testDate,
          startTime: '09:00',
          endTime: '10:00',
          purpose: 'Non-vacant test',
        })

      expect(res.status).toBe(409)
      expect(res.body.message.toLowerCase()).toContain('request flow')
    })

    it('POST /api/bookings/request with CR designation trying to book a lab returns 403', async () => {
      const lab = await Resource.create({
        name: `Test Lab ${Date.now()}`,
        type: 'lab',
        department: 'CSE',
        capacity: 40,
        requiresApprovalAlways: true,
        status: 'active',
      })
      extraResourceIds.push(lab._id)

      const res = await request(app)
        .post('/api/bookings/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: lab._id.toString(),
          date: testDate,
          startTime: '15:00',
          endTime: '16:00',
          formData: {
            eventName: 'Lab session',
            organizingBody: 'CSE Dept',
          },
        })

      expect(res.status).toBe(403)
    })

    it('POST /api/bookings/request with no approval routing configured returns 500 with a clear message', async () => {
      const noRoutingResource = await Resource.create({
        name: `No Routing Room ${Date.now()}`,
        type: 'classroom',
        department: `NoRoutingDept-${Date.now()}`,
        capacity: 25,
        requiresApprovalAlways: false,
        status: 'active',
      })
      extraResourceIds.push(noRoutingResource._id)

      const res = await request(app)
        .post('/api/bookings/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: noRoutingResource._id.toString(),
          date: testDate,
          startTime: '16:00',
          endTime: '17:00',
          formData: {
            eventName: 'Guest lecture',
            organizingBody: 'CSE Dept',
          },
        })

      expect(res.status).toBe(500)
      expect(res.body.message).toMatch(/no approver configured/i)
    })

    it('cancelling a booking invalidates its availability cache entry in Redis', async () => {
      const cacheResource = await Resource.create({
        name: `Cache Invalidation Room ${Date.now()}`,
        type: 'classroom',
        department: 'CSE',
        capacity: 30,
        requiresApprovalAlways: false,
        status: 'active',
      })
      extraResourceIds.push(cacheResource._id)

      const createRes = await request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          resourceId: cacheResource._id.toString(),
          date: testDate,
          startTime: '17:00',
          endTime: '18:00',
          purpose: 'Cache invalidation test',
        })
      expect(createRes.status).toBe(201)
      const bookingId = createRes.body.data.booking._id
      extraBookingIds.push(bookingId)

      const cacheKey = `avail:${cacheResource._id}:${testDate}`
      // Simulate a warm cache (as if availability had been read again after
      // booking) so cancellation's invalidation is unambiguously observable.
      await redis.setex(cacheKey, 300, JSON.stringify([{ start: '17:00', end: '18:00', status: 'occupied' }]))
      expect(await redis.get(cacheKey)).not.toBeNull()

      const cancelRes = await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${token1}`)
      expect(cancelRes.status).toBe(200)

      expect(await redis.get(cacheKey)).toBeNull()
    })
  })
})
