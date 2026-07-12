import api from './axios'

export const getPortalStatus = () => api.get('/portal/status').then((res) => res.data)

export const getCurrentWeek = () => api.get('/portal/current-week').then((res) => res.data)

export const overridePortalOpen = () => api.post('/portal/override-open').then((res) => res.data)

export const overridePortalClose = () => api.post('/portal/override-close').then((res) => res.data)
