import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { env } from '../config/env.js'
import redis from '../config/redis.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors.js'

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

const buildPayload = (user) => ({
  id: user._id.toString(),
  role: user.role,
  adminType: user.adminType,
  department: user.department,
  designation: user.designation,
})

const issueTokens = async (user) => {
  const payload = buildPayload(user)
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiry })
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  })

  await redis.set(`refresh:${user._id}`, refreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS)
  await User.findByIdAndUpdate(user._id, { refreshToken })

  return { accessToken, refreshToken }
}

export const registerCR = async (req, res) => {
  const { name, email, password, department, designation } = req.body

  const existing = await User.findOne({ email })
  if (existing) throw new ConflictError('Email already registered')

  const user = await User.create({
    name,
    email,
    password,
    department,
    designation,
    role: 'cr_faculty',
    adminType: null,
  })

  const { accessToken, refreshToken } = await issueTokens(user)
  return ApiResponse.success(
    res,
    { user, accessToken, refreshToken },
    'Registered successfully',
    201,
  )
}

export const registerAdmin = async (req, res) => {
  const { name, email, password, department, adminType } = req.body

  const existing = await User.findOne({ email })
  if (existing) throw new ConflictError('Email already registered')

  const designation = adminType === 'hod' ? 'HOD' : 'Dept Admin'

  await User.create({
    name,
    email,
    password,
    department,
    designation,
    role: 'admin',
    adminType,
    isApproved: false,
  })

  // Notifying the super admin is wired up once queues/notification.queue.js exists.
  return ApiResponse.success(res, null, 'Account pending super admin approval', 201)
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid email or password')
  }

  if (!user.isApproved) {
    throw new ForbiddenError('Account pending super admin approval')
  }

  const { accessToken, refreshToken } = await issueTokens(user)
  return ApiResponse.success(res, { user, accessToken, refreshToken }, 'Login successful')
}

export const refresh = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) throw new UnauthorizedError('Refresh token required')

  let decoded
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret)
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }

  const storedToken = await redis.get(`refresh:${decoded.id}`)
  if (!storedToken || storedToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token invalid or already used')
  }

  const user = await User.findById(decoded.id)
  if (!user) throw new UnauthorizedError('User no longer exists')

  // Rotation — invalidate the old token before issuing a new pair
  await redis.del(`refresh:${decoded.id}`)
  const tokens = await issueTokens(user)

  return ApiResponse.success(res, tokens, 'Token refreshed')
}

export const logout = async (req, res) => {
  await redis.del(`refresh:${req.user.id}`)
  await User.findByIdAndUpdate(req.user.id, { refreshToken: null })
  return ApiResponse.success(res, null, 'Logged out successfully')
}

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw new NotFoundError('User not found')
  return ApiResponse.success(res, { user }, 'Current user fetched')
}
