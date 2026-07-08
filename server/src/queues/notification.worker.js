import { Worker } from 'bullmq'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'

// Stub worker — Phase 7 wires up real email/in-app delivery per notification
// type. For now it just logs so queued jobs are consumed and don't pile up.
export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    logger.info(`[notification stub] ${job.name}`, job.data)
  },
  { connection: redis },
)

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} (${job?.name}) failed: ${err.message}`)
})

export default notificationWorker
