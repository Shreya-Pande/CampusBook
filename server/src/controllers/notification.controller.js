import mongoose from 'mongoose'
import Notification from '../models/Notification.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { NotFoundError } from '../utils/errors.js'

const paginate = (query) => {
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  return { page, limit, skip: (page - 1) * limit }
}

export const getMyNotifications = async (req, res) => {
  const { isRead } = req.query
  const { page, limit, skip } = paginate(req.query)

  const filter = { userId: req.user.id }
  if (isRead !== undefined) filter.isRead = isRead === 'true'

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user.id, isRead: false }),
  ])

  return ApiResponse.success(
    res,
    { notifications, page, limit, total, totalPages: Math.ceil(total / limit), unreadCount },
    'Notifications fetched',
  )
}

export const markAsRead = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Notification not found')

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { isRead: true },
    { returnDocument: 'after' },
  )
  if (!notification) throw new NotFoundError('Notification not found')

  return ApiResponse.success(res, { notification }, 'Notification marked as read')
}

export const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true })
  return ApiResponse.success(res, null, 'All notifications marked as read')
}
