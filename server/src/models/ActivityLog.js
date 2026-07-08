import mongoose from 'mongoose'

const ACTIONS = [
  'booking_created',
  'booking_approved',
  'booking_rejected',
  'booking_cancelled',
  'booking_expired',
  'resource_added',
  'resource_updated',
  'timetable_updated',
  'user_registered',
  'portal_opened',
  'portal_closed',
  'archive_completed',
]

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorRole: String,
    action: { type: String, enum: ACTIONS, required: true },
    targetId: mongoose.Schema.Types.ObjectId,
    targetType: String,
    description: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export default mongoose.model('ActivityLog', activityLogSchema)
