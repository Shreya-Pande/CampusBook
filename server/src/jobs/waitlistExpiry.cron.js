import cron from 'node-cron'
import logger from '../utils/logger.js'
import Waitlist from '../models/Waitlist.js'
import { notificationQueue } from '../queues/notification.queue.js'
import { triggerWaitlistCascade } from '../services/waitlist.service.js'

// CRON: every 5 minutes — offers whose 15-minute claim window has passed
// expire, and the freed slot cascades to the next person in line.
export const expireWaitlistOffers = async () => {
  const expired = await Waitlist.find({ status: 'offered', offerExpiresAt: { $lt: new Date() } })

  for (const offer of expired) {
    await Waitlist.findByIdAndUpdate(offer._id, { status: 'expired' })
    await notificationQueue.add('waitlist_expired', { waitlistId: offer._id, userId: offer.userId })
    await triggerWaitlistCascade({
      resourceId: offer.resourceId,
      date: offer.date,
      startTime: offer.startTime,
      endTime: offer.endTime,
    })
  }

  if (expired.length) logger.info(`Expired ${expired.length} waitlist offer(s)`)
}

export const startWaitlistExpiryCron = () => {
  cron.schedule('*/5 * * * *', expireWaitlistOffers)
  logger.info('Waitlist expiry cron registered')
}

export default startWaitlistExpiryCron
