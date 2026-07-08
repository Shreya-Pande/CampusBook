import mongoose from 'mongoose'

const weeklyPortalWindowSchema = new mongoose.Schema(
  {
    weekStartDate: { type: Date, required: true }, // Monday 00:00 UTC
    weekEndDate: { type: Date, required: true }, // Friday 17:00 UTC
    portalOpensAt: Date, // Sunday 12:00 PM
    portalClosesAt: Date, // Friday 5:00 PM
    roleOpenTimes: {
      faculty: Date, // Sunday 11:45 AM (15-min head start, configurable)
      cr_faculty: Date, // Sunday 12:00 PM
    },
    status: {
      type: String,
      enum: ['upcoming', 'open', 'closing', 'closed', 'archived'],
      default: 'upcoming',
    },
    stats: {
      totalBookingsMade: { type: Number, default: 0 },
      bookingsInFirst30Min: { type: Number, default: 0 }, // Sunday rush metric
      totalRequests: { type: Number, default: 0 },
      approvedRequests: { type: Number, default: 0 },
      rejectedRequests: { type: Number, default: 0 },
      expiredRequests: { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export default mongoose.model('WeeklyPortalWindow', weeklyPortalWindowSchema)
