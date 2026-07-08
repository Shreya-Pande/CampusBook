import Joi from 'joi'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const createTimetableSchema = Joi.object({
  resourceId: Joi.string().hex().length(24).required(),
  dayOfWeek: Joi.string()
    .valid(...DAYS)
    .required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
  subject: Joi.string().trim().required(),
  classSection: Joi.string().trim().required(),
  facultyName: Joi.string().trim().required(),
  semester: Joi.number().integer().min(0).max(12).required(),
  academicYear: Joi.string().trim().required(),
  effectiveFrom: Joi.date(),
  isActive: Joi.boolean(),
})

export const updateTimetableSchema = Joi.object({
  dayOfWeek: Joi.string().valid(...DAYS),
  startTime: Joi.string().pattern(TIME_PATTERN),
  endTime: Joi.string().pattern(TIME_PATTERN),
  subject: Joi.string().trim(),
  classSection: Joi.string().trim(),
  facultyName: Joi.string().trim(),
  semester: Joi.number().integer().min(0).max(12),
  academicYear: Joi.string().trim(),
  effectiveFrom: Joi.date(),
  isActive: Joi.boolean(),
}).min(1)

// One row of the bulk CSV: resourceName, dayOfWeek, startTime, endTime,
// subject, section, faculty, semester, academicYear
export const bulkTimetableRowSchema = Joi.object({
  resourceName: Joi.string().trim().required(),
  dayOfWeek: Joi.string()
    .valid(...DAYS)
    .required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
  subject: Joi.string().trim().required(),
  section: Joi.string().trim().required(),
  faculty: Joi.string().trim().required(),
  semester: Joi.number().integer().min(0).max(12).required(),
  academicYear: Joi.string().trim().required(),
})
