import api from './axios'

export const getResources = (params) => api.get('/resources', { params }).then((res) => res.data)

export const getTrendingResources = (params) =>
  api.get('/resources/trending', { params }).then((res) => res.data)

export const getResourceById = (id) => api.get(`/resources/${id}`).then((res) => res.data)

export const getResourceAvailability = (id, date) =>
  api.get(`/resources/${id}/availability`, { params: { date } }).then((res) => res.data)

export const getResourceTimetable = (id) =>
  api.get(`/resources/${id}/timetable`).then((res) => res.data)

export const createResource = (payload) => api.post('/resources', payload).then((res) => res.data)

export const updateResource = (id, payload) =>
  api.put(`/resources/${id}`, payload).then((res) => res.data)

export const setResourceStatus = (id, status) =>
  api.patch(`/resources/${id}/status`, { status }).then((res) => res.data)

export const toggleSaveResource = (id) => api.post(`/resources/save/${id}`).then((res) => res.data)
