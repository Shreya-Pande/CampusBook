import { ApiResponse } from '../utils/apiResponse.js'

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error) {
    const errors = error.details.map((detail) => detail.message)
    return ApiResponse.error(res, 'Validation failed', 400, errors)
  }

  req.body = value
  next()
}

export default validate
