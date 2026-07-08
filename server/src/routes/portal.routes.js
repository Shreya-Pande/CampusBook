import { Router } from 'express'
import * as portalController from '../controllers/portal.controller.js'
import { verifyToken, optionalAuth } from '../middleware/auth.middleware.js'
import { authorize, isSuperAdmin } from '../middleware/rbac.middleware.js'

const router = Router()

router.get('/status', optionalAuth, portalController.getStatus)
router.get('/current-week', optionalAuth, portalController.getCurrentWeek)

router.post(
  '/override-open',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  portalController.overrideOpen,
)
router.post(
  '/override-close',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  portalController.overrideClose,
)

export default router
