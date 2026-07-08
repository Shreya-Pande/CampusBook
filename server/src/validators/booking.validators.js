import Joi from 'joi'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

const formDataSchema = Joi.object({
  eventName: Joi.string().trim().required(),
  organizingBody: Joi.string().trim().required(),
  expectedAttendees: Joi.number().integer().min(1),
  facultyInCharge: Joi.string().trim(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  additionalNotes: Joi.string().trim().allow(''),
})

export const instantBookingSchema = Joi.object({
  resourceId: Joi.string().pattern(OBJECT_ID_PATTERN).required(),
  date: Joi.date().required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
  purpose: Joi.string().trim().required(),
  attendees: Joi.number().integer().min(1),
})

export const approvalBookingSchema = Joi.object({
  resourceId: Joi.string().pattern(OBJECT_ID_PATTERN).required(),
  date: Joi.date().required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
  formData: formDataSchema.required(),
  isEmergency: Joi.boolean(),
})

export const multiRoomBookingSchema = Joi.object({
  resourceIds: Joi.array().items(Joi.string().pattern(OBJECT_ID_PATTERN)).min(2).max(5).required(),
  date: Joi.date().required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
  formData: formDataSchema.required(),
  isEmergency: Joi.boolean(),
})
