import mongoose from 'mongoose'

// Identical structure to Booking — populated by the Friday 5:05 PM archive
// cron. Never deleted; analytics run against this collection for historical
// data once Booking is cleared for the next week.
const bookingArchiveSchema = new mongoose.Schema(
  {
    portalWindowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyPortalWindow',
      required: true,
    },
    resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    bookingType: { type: String, enum: ['instant', 'approval_required'], required: true },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'cancelled', 'completed', 'expired', 'archived'],
      default: 'pending',
    },
    assignedApproverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    formData: {
      eventName: String,
      organizingBody: String,
      expectedAttendees: Number,
      facultyInCharge: String,
      priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      additionalNotes: String,
    },
    isEmergency: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    archivedAt: { type: Date, default: Date.now },
    archiveReason: { type: String, enum: ['week_closed', 'manual'], default: 'week_closed' },
  },
  { timestamps: true },
)

export default mongoose.model('BookingArchive', bookingArchiveSchema)
