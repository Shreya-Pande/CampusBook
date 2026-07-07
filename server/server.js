import app from './src/app.js'
import { env } from './src/config/env.js'
import connectDB from './src/config/db.js'
import './src/config/redis.js'
import logger from './src/utils/logger.js'

const startServer = async () => {
  await connectDB()

  const server = app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`)
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
