import Joi from 'joi'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export const joinWaitlistSchema = Joi.object({
  resourceId: Joi.string().pattern(OBJECT_ID_PATTERN).required(),
  date: Joi.date().required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
})
