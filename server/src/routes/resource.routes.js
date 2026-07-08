import { Router } from 'express'
import * as resourceController from '../controllers/resource.controller.js'
import { verifyToken, optionalAuth } from '../middleware/auth.middleware.js'
import { authorize, isSuperAdmin } from '../middleware/rbac.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createResourceSchema,
  updateResourceSchema,
  setResourceStatusSchema,
} from '../validators/resource.validators.js'

const router = Router()

router.get('/', optionalAuth, resourceController.getAllResources)
router.get('/trending', optionalAuth, resourceController.getTrending)
router.get('/:id', optionalAuth, resourceController.getResourceById)
router.get('/:id/availability', optionalAuth, resourceController.getAvailability)
router.get('/:id/timetable', optionalAuth, resourceController.getTimetable)

router.post(
  '/',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  validate(createResourceSchema),
  resourceController.createResource,
)

router.put(
  '/:id',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  validate(updateResourceSchema),
  resourceController.updateResource,
)

router.patch(
  '/:id/status',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  validate(setResourceStatusSchema),
  resourceController.setResourceStatus,
)

router.post('/save/:id', verifyToken, resourceController.saveResource)

export default router
