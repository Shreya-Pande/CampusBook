import api from './axios'

export const createInstantBooking = (payload) =>
  api.post('/bookings/instant', payload).then((res) => res.data)

export const createApprovalBooking = (payload) =>
  api.post('/bookings/request', payload).then((res) => res.data)

export const createMultiRoomBooking = (payload) =>
  api.post('/bookings/multi-room', payload).then((res) => res.data)

export const getMyBookings = (params) => api.get('/bookings/my', { params }).then((res) => res.data)

export const getMyAllBookings = () => api.get('/bookings/my/all').then((res) => res.data)

export const getBookingById = (id) => api.get(`/bookings/${id}`).then((res) => res.data)

export const cancelBooking = (id) => api.delete(`/bookings/${id}`).then((res) => res.data)
