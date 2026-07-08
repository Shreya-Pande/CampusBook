import mongoose from 'mongoose'

const waitlistSchema = new mongoose.Schema(
  {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'offered', 'confirmed', 'expired', 'withdrawn'],
      default: 'waiting',
    },
    offerExpiresAt: Date,
    // Tied to the current week — cleared by the Friday 5:05 PM archive cron
    portalWindowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyPortalWindow',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export default mongoose.model('Waitlist', waitlistSchema)
