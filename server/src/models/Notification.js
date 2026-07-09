import mongoose from 'mongoose'

const NOTIFICATION_TYPES = [
  'portal_opening_soon',
  'portal_now_open',
  'portal_closed',
  'booking_instant_confirmed',
  'booking_pending_submitted',
  'booking_approved',
  'booking_rejected',
  'booking_expired',
  'booking_cancelled',
  'admin_new_request',
  'admin_expiry_warning',
  'reminder_1hr',
  'waitlist_offered',
  'waitlist_expired',
  'resource_added',
  'maintenance_alert',
]

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: ['email', 'in_app'], default: 'email' },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    metadata: { type: mongoose.Schema.Types.Mixed },
    scheduledFor: Date,
    sentAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
