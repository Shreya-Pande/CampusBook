import mongoose from 'mongoose'

const timetableSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  subject: String,
  classSection: String,
  facultyName: String,
  semester: Number,
  academicYear: String,
  // Supports mid-semester changes without deleting old data
  effectiveFrom: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
})

timetableSchema.index({ resourceId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 })
timetableSchema.index({ resourceId: 1, isActive: 1 })

export default mongoose.model('Timetable', timetableSchema)
