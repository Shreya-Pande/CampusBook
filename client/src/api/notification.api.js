import api from './axios'

export const getMyNotifications = (params) =>
  api.get('/notifications', { params }).then((res) => res.data)

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`).then((res) => res.data)

export const markAllNotificationsRead = () => api.patch('/notifications/read-all').then((res) => res.data)
