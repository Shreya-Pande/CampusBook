import mongoose from 'mongoose'

const RESOURCE_TYPES = [
  'classroom',
  'lab',
  'auditorium',
  'sports_court',
  'meeting_room',
  'conference_room',
  'studio',
  'study_room',
]

const approvalRoutingSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    resourceType: { type: String, enum: [...RESOURCE_TYPES, 'all'], required: true },
    bookingType: {
      type: String,
      enum: ['non_vacant', 'approval_required', 'all'],
      required: true,
    },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

export default mongoose.model('ApprovalRouting', approvalRoutingSchema)
