import Joi from 'joi'

export const registerCRSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  department: Joi.string().trim().required(),
  designation: Joi.string()
    .valid('CR', 'Club Head', 'Event Head', 'TnP Officer', 'Faculty')
    .required(),
})

export const registerAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  department: Joi.string().trim().required(),
  adminType: Joi.string().valid('hod', 'department_admin').required(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
})
