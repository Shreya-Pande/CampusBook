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

const resourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    department: { type: String, required: true, trim: true },
    building: String,
    floor: String,
    capacity: { type: Number, required: true },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    // Labs, auditoriums, meeting rooms → always true
    requiresApprovalAlways: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export default mongoose.model('Resource', resourceSchema)
