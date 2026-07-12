import api from './axios'

export const joinWaitlist = (payload) => api.post('/waitlist', payload).then((res) => res.data)

export const getMyWaitlist = () => api.get('/waitlist/my').then((res) => res.data)

export const withdrawFromWaitlist = (id) => api.delete(`/waitlist/${id}`).then((res) => res.data)

export const confirmWaitlistOffer = (id) => api.post(`/waitlist/${id}/confirm`).then((res) => res.data)
