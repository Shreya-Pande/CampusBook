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

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
)

// Global rate limit — tightened per-route (e.g. booking) in later phases
app.use('/api', globalLimiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
})

app.get('/api/health', (req, res) => {
  const mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected'

  return ApiResponse.success(
    res,
    { uptime: process.uptime(), mongodb, redis: redisStatus },
    'Server is healthy',
  )
})

app.use('/api/auth', authRoutes)

// Remaining domain routes (portal, resource, timetable, booking, admin,
// waitlist, notification) are mounted here as each phase implements them.

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
