import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { authorize, deptFilter, isSuperAdmin } from '../middleware/rbac.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createRoutingRuleSchema,
  updateRoutingRuleSchema,
  approveRequestSchema,
  rejectRequestSchema,
  updateUserRoleSchema,
} from '../validators/admin.validators.js'

const router = Router()

// Every admin route needs a logged-in admin-tier user; deptFilter is a no-op
// for super admin and narrows everyone else to their own assignedApproverId.
router.use(verifyToken)
router.use(authorize('admin'))
router.use(deptFilter)

router.get('/requests', adminController.getRequests)
router.get('/requests/:id', adminController.getRequestById)
router.patch(
  '/requests/:id/approve',
  validate(approveRequestSchema),
  adminController.approveRequest,
)
router.patch('/requests/:id/reject', validate(rejectRequestSchema), adminController.rejectRequest)

router.get('/routing', isSuperAdmin, adminController.getRoutingConfig)
router.post(
  '/routing',
  isSuperAdmin,
  validate(createRoutingRuleSchema),
  adminController.createRoutingRule,
)
router.put(
  '/routing/:id',
  isSuperAdmin,
  validate(updateRoutingRuleSchema),
  adminController.updateRoutingRule,
)
router.delete('/routing/:id', isSuperAdmin, adminController.deleteRoutingRule)

router.get('/users', isSuperAdmin, adminController.getAllUsers)
router.patch('/users/:id/approve', isSuperAdmin, adminController.approveAdminAccount)
router.patch(
  '/users/:id/role',
  isSuperAdmin,
  validate(updateUserRoleSchema),
  adminController.updateUserRole,
)

router.get('/analytics/overview', adminController.getAnalyticsOverview)
router.get('/analytics/utilization', adminController.getUtilization)
router.get('/analytics/peak-times', adminController.getPeakHours)
router.get('/analytics/departments', adminController.getDepartmentBreakdown)
router.get('/analytics/portal-rush', adminController.getPortalRush)
router.get('/analytics/hod-response-time', adminController.getHodResponseTime)
router.get('/activity', adminController.getActivityLog)

export default router
