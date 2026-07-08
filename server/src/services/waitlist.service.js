import logger from '../utils/logger.js'

// Full waitlist offer/cascade logic (Waitlist model lookups, 15-min offer
// window) lands in Phase 8. Booking cancellation and rejection flows
// (Phase 5/6) already need to call this hook so the slot re-opens correctly
// once Phase 8 replaces this with the real cascade.
export const triggerWaitlistCascade = async ({ resourceId, date, startTime, endTime }) => {
  const dateLabel = date instanceof Date ? date.toDateString() : date
  logger.info(
    `Waitlist cascade skipped (Phase 8 pending) for resource ${resourceId} on ${dateLabel} ${startTime}-${endTime}`,
  )
}

export default triggerWaitlistCascade
