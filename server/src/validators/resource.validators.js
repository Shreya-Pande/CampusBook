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

export const createResourceSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string()
    .valid(...RESOURCE_TYPES)
    .required(),
  department: Joi.string().trim().required(),
  building: Joi.string().trim(),
  floor: Joi.string().trim(),
  capacity: Joi.number().integer().min(1).required(),
  amenities: Joi.array().items(Joi.string().trim()),
  images: Joi.array().items(Joi.string().uri()),
  requiresApprovalAlways: Joi.boolean(),
  status: Joi.string().valid('active', 'maintenance', 'inactive'),
})

export const updateResourceSchema = Joi.object({
  name: Joi.string().trim(),
  type: Joi.string().valid(...RESOURCE_TYPES),
  department: Joi.string().trim(),
  building: Joi.string().trim(),
  floor: Joi.string().trim(),
  capacity: Joi.number().integer().min(1),
  amenities: Joi.array().items(Joi.string().trim()),
  images: Joi.array().items(Joi.string().uri()),
  requiresApprovalAlways: Joi.boolean(),
  status: Joi.string().valid('active', 'maintenance', 'inactive'),
}).min(1)

export const setResourceStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'maintenance', 'inactive').required(),
})
