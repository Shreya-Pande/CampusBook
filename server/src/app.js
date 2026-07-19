import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from './config/env.js'
import redis from './config/redis.js'
import logger from './utils/logger.js'
import { ApiResponse } from './utils/apiResponse.js'
import { AppError } from './utils/errors.js'
import { globalLimiter } from './middleware/rateLimit.middleware.js'
import authRoutes from './routes/auth.routes.js'
import timetableRoutes from './routes/timetable.routes.js'
import portalRoutes from './routes/portal.routes.js'
import resourceRoutes from './routes/resource.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import adminRoutes from './routes/admin.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import waitlistRoutes from './routes/waitlist.routes.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: [env.clientUrl, env.clientUrlProd].filter(Boolean),
    credentials: true,
  }),
)

app.use('/api', globalLimiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
})

app.get('/api/health', async (req, res) => {
  const mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'

  let redisStatus
  try {
    redisStatus = (await redis.ping()) === 'PONG' ? 'connected' : 'disconnected'
  } catch {
    redisStatus = 'disconnected'
  }

  const isHealthy = mongodb === 'connected' && redisStatus === 'connected'

  return ApiResponse.success(
    res,
    { uptime: process.uptime(), mongodb, redis: redisStatus },
    isHealthy ? 'Server is healthy' : 'Server is degraded',
    isHealthy ? 200 : 503,
  )
})

app.get('/api/seed-now', async (req, res) => {
  if (req.query.secret !== 'campusbook2025') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  try {
    const { default: User } = await import('./models/User.js')
    const { default: Resource } = await import('./models/Resource.js')
    const { default: Timetable } = await import('./models/Timetable.js')

    // Super admin
    const existing = await User.findOne({ adminType: 'super_admin' })
    if (!existing) {
      const hashed = await bcrypt.hash('SuperAdmin@2025', 10)
      await User.create({
        name: 'Super Admin',
        email: 'superadmin@college.edu',
        password: hashed,
        role: 'admin',
        adminType: 'super_admin',
        department: 'Administration',
        designation: 'Dept Admin',
        isApproved: true,
      })
      logger.info('Super admin created')
    } else {
      logger.info('Super admin already exists, skipping')
    }

    // HODs
    const hods = [
      { name: 'CSE HOD', email: 'hod.cse@college.edu', department: 'CSE' },
      { name: 'IT HOD', email: 'hod.it@college.edu', department: 'IT' },
    ]
    for (const hod of hods) {
      const exists = await User.findOne({ email: hod.email })
      if (!exists) {
        const hashed = await bcrypt.hash('SuperAdmin@2025', 10)
        await User.create({
          ...hod,
          password: hashed,
          role: 'admin',
          adminType: 'hod',
          designation: 'HOD',
          isApproved: true,
        })
        logger.info(`HOD created: ${hod.email}`)
      } else {
        logger.info(`HOD already exists: ${hod.email}, skipping`)
      }
    }

    // Resources
    await Resource.deleteMany({})
    const resourceDocs = await Resource.insertMany([
      {
        name: 'Classroom 101',
        type: 'classroom',
        department: 'CSE',
        building: 'A Block',
        floor: 'Lvl 1',
        capacity: 60,
        amenities: ['projector', 'whiteboard'],
        requiresApprovalAlways: false,
        status: 'active',
        isActive: true,
      },
      {
        name: 'Classroom 202',
        type: 'classroom',
        department: 'IT',
        building: 'B Block',
        floor: 'Lvl 2',
        capacity: 50,
        amenities: ['projector', 'ac'],
        requiresApprovalAlways: false,
        status: 'active',
        isActive: true,
      },
      {
        name: 'Main Auditorium',
        type: 'auditorium',
        department: 'Administration',
        building: 'Main Block',
        floor: 'Lvl Ground',
        capacity: 300,
        amenities: ['projector', 'ac', 'whiteboard'],
        requiresApprovalAlways: true,
        status: 'active',
        isActive: true,
      },
      {
        name: 'Networks Lab',
        type: 'lab',
        department: 'CSE',
        building: 'A Block',
        floor: 'Lvl 3',
        capacity: 30,
        amenities: ['computers', 'ac', 'projector'],
        requiresApprovalAlways: true,
        status: 'active',
        isActive: true,
      },
    ])
    logger.info(`${resourceDocs.length} resources seeded`)

    // Timetable
    await Timetable.deleteMany({})
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const classrooms = resourceDocs.filter((r) => r.type === 'classroom')
    const entries = []
    for (const room of classrooms) {
      for (const day of days) {
        entries.push({
          resourceId: room._id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '10:00',
          subject: 'Data Structures',
          classSection: 'CSE-3A',
          facultyName: 'Dr. Sharma',
          semester: 3,
          academicYear: '2025-26',
          isActive: true,
        })
        entries.push({
          resourceId: room._id,
          dayOfWeek: day,
          startTime: '11:00',
          endTime: '12:00',
          subject: 'Algorithms',
          classSection: 'CSE-4B',
          facultyName: 'Dr. Gupta',
          semester: 4,
          academicYear: '2025-26',
          isActive: true,
        })
      }
    }
    await Timetable.insertMany(entries)
    logger.info(`${entries.length} timetable entries seeded`)

    return res.json({
      success: true,
      message: `Seeded successfully: 1 super admin, 2 HODs, ${resourceDocs.length} resources, ${entries.length} timetable entries`,
    })
  } catch (err) {
    logger.error(`Seed endpoint error: ${err.message}`)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/waitlist', waitlistRoutes)

app.use((req, res) => {
  return ApiResponse.error(res, `Route ${req.originalUrl} not found`, 404)
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode || 500

  if (statusCode >= 500) {
    logger.error(err.stack || err.message)
  }

  return ApiResponse.error(res, err.message || 'Internal server error', statusCode)
})

export default app