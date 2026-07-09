import { Worker } from 'bullmq'
import nodemailer from 'nodemailer'
import redis from '../config/redis.js'
import logger from '../utils/logger.js'
import { env } from '../config/env.js'
import Notification from '../models/Notification.js'
import Booking from '../models/Booking.js'
import User from '../models/User.js'
import Waitlist from '../models/Waitlist.js'
import Resource from '../models/Resource.js'
import * as templates from '../utils/emailTemplates.js'

// Resend's SMTP relay — works with any existing nodemailer setup without
// pulling in Resend's own SDK. `onboarding@resend.dev` is the sandbox sender
// Resend allows without a verified domain (delivery is then restricted to
// the email address that owns RESEND_API_KEY).
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: { user: 'resend', pass: env.resendApiKey },
})

const FROM_ADDRESS = 'CampusBook <onboarding@resend.dev>'

const loadBooking = (bookingId) =>
  Booking.findById(bookingId)
    .populate('userId', 'name email')
    .populate('resourceIds', 'name department')

const slot = (booking) => ({
  resourceName: booking.resourceIds?.[0]?.name || 'Resource',
  date: booking.date.toDateString(),
  startTime: booking.startTime,
  endTime: booking.endTime,
})

const allApprovedUsers = () => User.find({ isApproved: true }).select('name email')

const broadcast = (users, buildTemplate) =>
  users
    .filter((user) => user.email)
    .map((user) => {
      const { subject, html } = buildTemplate(user)
      return { userId: user._id, email: user.email, subject, html, metadata: {} }
    })

// Each handler resolves job.data into recipient(s): { userId, email, subject,
// html, metadata } for a single recipient, or an array of those for
// broadcast-style notifications (portal_*, maintenance_alert). Returning
// null/undefined means "nothing to send" (e.g. the booking was deleted).
const HANDLERS = {
  portal_opening_soon: async () =>
    broadcast(await allApprovedUsers(), (user) => templates.portalOpeningSoonEmail({ userName: user.name })),

  portal_now_open: async () =>
    broadcast(await allApprovedUsers(), (user) => templates.portalNowOpenEmail({ userName: user.name })),

  portal_closed: async () =>
    broadcast(await allApprovedUsers(), (user) => templates.portalClosedEmail({ userName: user.name })),

  booking_instant_confirmed: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingInstantConfirmedEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  booking_pending_submitted: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingPendingSubmittedEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  admin_new_request: async ({ bookingId, approverId }) => {
    const [booking, approver] = await Promise.all([
      loadBooking(bookingId),
      User.findById(approverId).select('name email'),
    ])
    if (!booking?.userId || !approver?.email) return null
    const { subject, html } = templates.adminNewRequestEmail({
      approverName: approver.name,
      requesterName: booking.userId.name,
      eventName: booking.formData?.eventName,
      ...slot(booking),
    })
    return { userId: approver._id, email: approver.email, subject, html, metadata: { bookingId, approverId } }
  },

  admin_expiry_warning: async ({ approverId, count, expiresAt }) => {
    const approver = await User.findById(approverId).select('name email')
    if (!approver?.email) return null
    const { subject, html } = templates.adminExpiryWarningEmail({
      approverName: approver.name,
      count,
      expiresAt,
    })
    return { userId: approver._id, email: approver.email, subject, html, metadata: { approverId, count } }
  },

  booking_approved: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingApprovedEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  booking_rejected: async ({ bookingId, reason }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingRejectedEmail({
      userName: booking.userId.name,
      reason: reason || booking.rejectionReason,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  booking_expired: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingExpiredEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  booking_cancelled: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.bookingCancelledEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  reminder_1hr: async ({ bookingId }) => {
    const booking = await loadBooking(bookingId)
    if (!booking?.userId) return null
    const { subject, html } = templates.reminder1hrEmail({
      userName: booking.userId.name,
      ...slot(booking),
    })
    return { userId: booking.userId._id, email: booking.userId.email, subject, html, metadata: { bookingId } }
  },

  waitlist_offered: async ({ waitlistId, userId }) => {
    const waitlist = await Waitlist.findById(waitlistId)
      .populate('resourceId', 'name')
      .populate('userId', 'name email')
    const user = waitlist?.userId || (userId && (await User.findById(userId).select('name email')))
    if (!user?.email) return null
    const { subject, html } = templates.waitlistOfferedEmail({
      userName: user.name,
      resourceName: waitlist?.resourceId?.name || 'Resource',
      date: waitlist?.date?.toDateString() || '',
      startTime: waitlist?.startTime || '',
      endTime: waitlist?.endTime || '',
      offerExpiresAt: waitlist?.offerExpiresAt,
    })
    return { userId: user._id, email: user.email, subject, html, metadata: { waitlistId } }
  },

  waitlist_expired: async ({ waitlistId, userId }) => {
    const waitlist = waitlistId
      ? await Waitlist.findById(waitlistId).populate('resourceId', 'name').populate('userId', 'name email')
      : null
    const user = waitlist?.userId || (userId && (await User.findById(userId).select('name email')))
    if (!user?.email) return null
    const { subject, html } = templates.waitlistExpiredEmail({
      userName: user.name,
      resourceName: waitlist?.resourceId?.name || 'Resource',
      date: waitlist?.date?.toDateString() || '',
      startTime: waitlist?.startTime || '',
      endTime: waitlist?.endTime || '',
    })
    return { userId: user._id, email: user.email, subject, html, metadata: { waitlistId } }
  },

  maintenance_alert: async ({ resourceId }) => {
    const [resource, users] = await Promise.all([
      Resource.findById(resourceId).select('name'),
      allApprovedUsers(),
    ])
    return broadcast(users, () =>
      templates.maintenanceAlertEmail({ resourceName: resource?.name || 'A resource' }),
    ).map((recipient) => ({ ...recipient, metadata: { resourceId } }))
  },
}

const sendEmail = (to, { subject, html }) => transporter.sendMail({ from: FROM_ADDRESS, to, subject, html })

// Notification docs are keyed on (userId, type, metadata.jobId) so a BullMQ
// retry updates the same record instead of creating a duplicate, and
// recipients that already succeeded on a prior attempt aren't re-emailed.
const deliverToRecipient = async (job, recipient) => {
  let notification = await Notification.findOne({
    userId: recipient.userId,
    type: job.name,
    'metadata.jobId': job.id,
  })

  if (!notification) {
    notification = await Notification.create({
      userId: recipient.userId,
      type: job.name,
      channel: 'email',
      status: 'queued',
      metadata: { ...recipient.metadata, jobId: job.id },
      scheduledFor: new Date(),
    })
  }

  if (notification.status === 'sent') return

  try {
    await sendEmail(recipient.email, recipient)
    notification.status = 'sent'
    notification.sentAt = new Date()
    await notification.save()
  } catch (err) {
    notification.status = 'failed'
    await notification.save()
    logger.error(`Notification email failed (${job.name} -> ${recipient.email}): ${err.message}`)
    throw err
  }
}

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const handler = HANDLERS[job.name]
    if (!handler) {
      logger.warn(`No handler registered for notification type: ${job.name}`)
      return
    }

    const result = await handler(job.data)
    const recipients = (Array.isArray(result) ? result : [result]).filter((r) => r?.email)

    for (const recipient of recipients) {
      await deliverToRecipient(job, recipient)
    }
  },
  { connection: redis },
)

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} (${job?.name}) failed: ${err.message}`)
})

export default notificationWorker
