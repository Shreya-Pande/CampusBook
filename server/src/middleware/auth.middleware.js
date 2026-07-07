import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../utils/errors.js'

const extractToken = (req) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

export const verifyToken = (req, res, next) => {
  const token = extractToken(req)
  if (!token) throw new UnauthorizedError('Authentication token required')

  try {
    req.user = jwt.verify(token, env.jwt.accessSecret)
    next()
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export const optionalAuth = (req, res, next) => {
  const token = extractToken(req)
  if (!token) return next()

  try {
    req.user = jwt.verify(token, env.jwt.accessSecret)
  } catch {
    // Invalid/expired token on a public route — proceed unauthenticated
  }
  next()
}
