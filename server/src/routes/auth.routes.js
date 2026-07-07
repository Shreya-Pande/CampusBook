import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { authLimiter } from '../middleware/rateLimit.middleware.js'
import { registerCRSchema, registerAdminSchema, loginSchema } from '../validators/auth.validators.js'

const router = Router()

router.use(authLimiter)

router.post('/register/cr', validate(registerCRSchema), authController.registerCR)
router.post('/register/admin', validate(registerAdminSchema), authController.registerAdmin)
router.post('/login', validate(loginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', verifyToken, authController.logout)
router.get('/me', verifyToken, authController.getMe)

export default router
