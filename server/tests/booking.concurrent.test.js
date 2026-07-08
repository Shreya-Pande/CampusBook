import request from 'supertest'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import app from '../src/app.js'
import connectDB from '../src/config/db.js'
import redis from '../src/config/redis.js'
import { env } from '../src/config/env.js'
import User from '../src/models/User.js'
import Resource from '../src/models/Resource.js'
import Booking from '../src/models/Booking.js'
import WeeklyPortalWindow from '../src/models/WeeklyPortalWindow.js'
import { getNextMonday, getNextFriday, formatLocalDate } from '../src/utils/timeUtils.js'

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
    await connectDB()

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
})
