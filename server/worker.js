import connectDB from './src/config/db.js'
import './src/config/redis.js'
import logger from './src/utils/logger.js'
import { startPortalWindowCrons } from './src/jobs/portalWindow.cron.js'
import { startWaitlistExpiryCron } from './src/jobs/waitlistExpiry.cron.js'
import './src/queues/notification.worker.js'

const startWorker = async () => {
  await connectDB()

  startPortalWindowCrons()
  startWaitlistExpiryCron()

  logger.info('Worker process started — cron jobs and notification worker are running')
}

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down worker...`)
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

startWorker().catch((err) => {
  logger.error(`Failed to start worker: ${err.message}`)
  process.exit(1)
})
