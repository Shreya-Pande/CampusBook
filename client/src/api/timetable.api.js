import api from './axios'

export const getResourceTimetableEntries = (resourceId) =>
  api.get(`/timetable/${resourceId}`).then((res) => res.data)

export const addTimetableEntry = (payload) => api.post('/timetable', payload).then((res) => res.data)

export const updateTimetableEntry = (id, payload) =>
  api.put(`/timetable/${id}`, payload).then((res) => res.data)

export const deleteTimetableEntry = (id) => api.delete(`/timetable/${id}`).then((res) => res.data)

export const bulkUploadTimetable = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post('/timetable/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data)
}
