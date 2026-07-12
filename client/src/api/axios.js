import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_URL

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Queue of requests waiting on an in-flight token refresh, so concurrent 401s
// trigger exactly one /auth/refresh call instead of one per request.
let isRefreshing = false
let pendingQueue = []

const flushQueue = (error, accessToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(accessToken)
  })
  pendingQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh')

    if (status !== 401 || !originalRequest || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error)
    }

    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Plain axios, not `api` — refresh must not go through these same
      // interceptors, or a failed refresh would recurse into itself.
      const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
      const { accessToken, refreshToken: newRefreshToken } = data.data

      setTokens(accessToken, newRefreshToken)
      flushQueue(null, accessToken)

      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError)
      logout()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
