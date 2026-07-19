import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
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