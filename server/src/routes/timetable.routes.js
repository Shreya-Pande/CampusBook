import { Router } from 'express'
import multer from 'multer'
import * as timetableController from '../controllers/timetable.controller.js'
import { verifyToken, optionalAuth } from '../middleware/auth.middleware.js'
import { authorize, isSuperAdmin } from '../middleware/rbac.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createTimetableSchema, updateTimetableSchema } from '../validators/timetable.validators.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/:resourceId', optionalAuth, timetableController.getByResource)

router.post(
  '/',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  validate(createTimetableSchema),
  timetableController.addEntry,
)

router.put(
  '/:id',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  validate(updateTimetableSchema),
  timetableController.updateEntry,
)

router.delete('/:id', verifyToken, authorize('admin'), isSuperAdmin, timetableController.deleteEntry)

router.post(
  '/bulk',
  verifyToken,
  authorize('admin'),
  isSuperAdmin,
  upload.single('file'),
  timetableController.bulkUpload,
)

export default router
