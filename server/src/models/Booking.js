import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    portalWindowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyPortalWindow',
      required: true,
    },
    resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Date-specific as specified — not just time-specific
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
  },
  { timestamps: true },
)

bookingSchema.index({ resourceIds: 1, date: 1, startTime: 1, endTime: 1, status: 1 })
bookingSchema.index({ userId: 1, portalWindowId: 1 })
bookingSchema.index({ assignedApproverId: 1, status: 1 })
bookingSchema.index({ date: 1, dayOfWeek: 1 })

export default mongoose.model('Booking', bookingSchema)
