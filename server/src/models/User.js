import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const DESIGNATIONS = [
  'CR',
  'Club Head',
  'Event Head',
  'TnP Officer',
  'Faculty',
  'HOD',
  'Lab Admin',
  'Dept Admin',
]

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['cr_faculty', 'admin'], required: true },
    adminType: {
      type: String,
      enum: ['super_admin', 'hod', 'department_admin', null],
      default: null,
    },
    department: { type: String, trim: true },
    designation: { type: String, enum: DESIGNATIONS },
    isApproved: {
      type: Boolean,
      // CR/Faculty accounts are usable immediately; admin accounts wait on
      // super admin approval unless explicitly seeded/approved otherwise.
      default: function defaultApproval() {
        return this.role === 'cr_faculty'
      },
    },
    gamification: {
      level: { type: Number, default: 1 },
      totalBookings: { type: Number, default: 0 },
      onTimeCheckIns: { type: Number, default: 0 },
      hoursSaved: { type: Number, default: 0 },
      badges: { type: [String], default: [] },
    },
    savedResources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
    refreshToken: { type: String, default: null },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.refreshToken
    delete ret.__v
    return ret
  },
})

export default mongoose.model('User', userSchema)
