import { connectDB } from './src/config/db.js'
import './src/config/redis.js'
import logger from './src/utils/logger.js'
import app from './src/app.js'
import { env } from './src/config/env.js'

const startServer = async () => {
  await connectDB()

  // Start cron jobs and notification worker in same process
  // (acceptable for free-tier deployment — separate worker for paid plans)
  try {
    const { initializePortalWindow, startPortalWindowCrons } = await import(
      './src/jobs/portalWindow.cron.js'
    )
    const { startWaitlistExpiryCron } = await import('./src/jobs/waitlistExpiry.cron.js')
    await import('./src/queues/notification.worker.js')
    await initializePortalWindow()
    startPortalWindowCrons()
    startWaitlistExpiryCron()
    logger.info('Cron jobs and notification worker started')
  } catch (err) {
    logger.warn(`Worker startup warning: ${err.message}`)
  }

  const port = env.port || 5000
  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`)
  })

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`)
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`)
  process.exit(1)
})
