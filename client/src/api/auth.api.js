import api from './axios'

export const registerCR = (payload) => api.post('/auth/register/cr', payload).then((res) => res.data)

export const registerAdmin = (payload) =>
  api.post('/auth/register/admin', payload).then((res) => res.data)

export const login = (payload) => api.post('/auth/login', payload).then((res) => res.data)

export const refreshAccessToken = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then((res) => res.data)

export const logout = () => api.post('/auth/logout').then((res) => res.data)

export const getMe = () => api.get('/auth/me').then((res) => res.data)
