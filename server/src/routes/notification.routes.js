import { Router } from 'express'
import * as notificationController from '../controllers/notification.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = Router()

router.use(verifyToken)

router.get('/', notificationController.getMyNotifications)
router.patch('/:id/read', notificationController.markAsRead)
router.patch('/read-all', notificationController.markAllAsRead)

export default router
