import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { ApiResponse } from '../utils/apiResponse.js'

// Integration test suites legitimately exercise an endpoint far more than a
// real client would within one window (e.g. the auth suite alone makes more
// requests than authLimiter's max) — skip enforcement under Jest rather than
// let unrelated 429s fail assertions about actual business logic.
const skipInTest = () => env.nodeEnv === 'test'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res) => ApiResponse.error(res, 'Too many requests, please try again later.', 429),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  handler: (req, res) =>
    ApiResponse.error(res, 'Too many auth attempts, please try again later.', 429),
})

// Tightened during the Sunday 12PM rush (Section 3 of the blueprint) — keyed
// per authenticated user rather than per IP so one user bulk-booking rooms
// can't crowd out everyone else on the same network/NAT. Booking routes sit
// behind verifyToken already, so req.user is always present here.
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => ApiResponse.error(res, 'Too many booking requests, please slow down.', 429),
})
