import rateLimit from 'express-rate-limit'
import { ApiResponse } from '../utils/apiResponse.js'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => ApiResponse.error(res, 'Too many requests, please try again later.', 429),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    ApiResponse.error(res, 'Too many auth attempts, please try again later.', 429),
})
