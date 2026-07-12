import api from './axios'

// Requests
export const getAdminRequests = (params) =>
  api.get('/admin/requests', { params }).then((res) => res.data)

export const getAdminRequestById = (id) => api.get(`/admin/requests/${id}`).then((res) => res.data)

export const approveRequest = (id, payload) =>
  api.patch(`/admin/requests/${id}/approve`, payload).then((res) => res.data)

export const rejectRequest = (id, reason) =>
  api.patch(`/admin/requests/${id}/reject`, { reason }).then((res) => res.data)

// Routing config
export const getRoutingConfig = () => api.get('/admin/routing').then((res) => res.data)

export const createRoutingRule = (payload) =>
  api.post('/admin/routing', payload).then((res) => res.data)

export const updateRoutingRule = (id, payload) =>
  api.put(`/admin/routing/${id}`, payload).then((res) => res.data)

export const deleteRoutingRule = (id) => api.delete(`/admin/routing/${id}`).then((res) => res.data)

// Users
export const getAllUsers = (params) => api.get('/admin/users', { params }).then((res) => res.data)

export const approveAdminAccount = (id) =>
  api.patch(`/admin/users/${id}/approve`).then((res) => res.data)

export const updateUserRole = (id, payload) =>
  api.patch(`/admin/users/${id}/role`, payload).then((res) => res.data)

// Analytics
export const getAnalyticsOverview = (params) =>
  api.get('/admin/analytics/overview', { params }).then((res) => res.data)

export const getUtilization = () => api.get('/admin/analytics/utilization').then((res) => res.data)

export const getPeakHours = (params) =>
  api.get('/admin/analytics/peak-times', { params }).then((res) => res.data)

export const getDepartmentBreakdown = (params) =>
  api.get('/admin/analytics/departments', { params }).then((res) => res.data)

export const getPortalRush = () => api.get('/admin/analytics/portal-rush').then((res) => res.data)

export const getHodResponseTime = () =>
  api.get('/admin/analytics/hod-response-time').then((res) => res.data)

// Activity
export const getActivityLog = (params) => api.get('/admin/activity', { params }).then((res) => res.data)
