import Redis from 'ioredis'
import { env } from './env.js'
import logger from '../utils/logger.js'

// maxRetriesPerRequest: null is required so this connection can also be
// handed to BullMQ queues/workers (queues/notification.queue.js et al.)
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 500, 10000),
})

redis.on('connect', () => {
  logger.info('Redis connected')
})

redis.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`)
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

export default redis
