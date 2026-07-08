import { ForbiddenError } from '../utils/errors.js'

// Matches against role ('cr_faculty' | 'admin') AND adminType
// ('super_admin' | 'hod' | 'department_admin'), so routes can be scoped to
// either granularity, e.g. authorize('admin') or authorize('super_admin').
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) throw new ForbiddenError('Authentication required')

    const identity = [req.user.role, req.user.adminType].filter(Boolean)
    const allowed = identity.some((value) => roles.includes(value))
    if (!allowed) throw new ForbiddenError('You do not have permission to perform this action')

    next()
  }

export const deptFilter = (req, res, next) => {
  req.deptFilter =
    req.user?.adminType === 'super_admin' ? {} : { assignedApproverId: req.user?.id }
  next()
}

// Stricter than authorize('super_admin') alone — layers on top of a role
// check (e.g. authorize('admin')) so HODs/department_admins are explicitly
// rejected from super-admin-only routes like timetable writes.
export const isSuperAdmin = (req, res, next) => {
  if (req.user?.adminType !== 'super_admin') {
    throw new ForbiddenError('Super admin access required')
  }
  next()
}
