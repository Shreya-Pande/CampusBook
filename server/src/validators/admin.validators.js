import Joi from 'joi'

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
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export const createRoutingRuleSchema = Joi.object({
  department: Joi.string().trim().required(),
  resourceType: Joi.string()
    .valid(...RESOURCE_TYPES, 'all')
    .required(),
  bookingType: Joi.string().valid('non_vacant', 'approval_required', 'all').required(),
  approverId: Joi.string().pattern(OBJECT_ID_PATTERN).required(),
})

export const updateRoutingRuleSchema = Joi.object({
  department: Joi.string().trim(),
  resourceType: Joi.string().valid(...RESOURCE_TYPES, 'all'),
  bookingType: Joi.string().valid('non_vacant', 'approval_required', 'all'),
  approverId: Joi.string().pattern(OBJECT_ID_PATTERN),
}).min(1)

export const approveRequestSchema = Joi.object({
  note: Joi.string().trim().max(500).allow(''),
})

export const rejectRequestSchema = Joi.object({
  reason: Joi.string().trim().min(20).required(),
})

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('cr_faculty', 'admin'),
  adminType: Joi.string().valid('super_admin', 'hod', 'department_admin').allow(null),
  department: Joi.string().trim(),
  designation: Joi.string().valid(...DESIGNATIONS),
}).min(1)
