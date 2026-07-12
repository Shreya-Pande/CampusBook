import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { CalendarX2, Plus, Upload } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { useResources } from '../../../hooks/useResources'
import {
  getResourceTimetableEntries,
  addTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  bulkUploadTimetable,
} from '../../../api/timetable.api'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './ManageTimetablePage.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const emptyForm = {
  dayOfWeek: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
  subject: '',
  classSection: '',
  facultyName: '',
  semester: '',
  academicYear: '',
}

const toFormValues = (entry) => ({
  dayOfWeek: entry.dayOfWeek,
  startTime: entry.startTime,
  endTime: entry.endTime,
  subject: entry.subject || '',
  classSection: entry.classSection || '',
  facultyName: entry.facultyName || '',
  semester: String(entry.semester ?? ''),
  academicYear: entry.academicYear || '',
})

const toPayload = (values) => ({
  dayOfWeek: values.dayOfWeek,
  startTime: values.startTime,
  endTime: values.endTime,
  subject: values.subject.trim(),
  classSection: values.classSection.trim(),
  facultyName: values.facultyName.trim(),
  semester: Number(values.semester),
  academicYear: values.academicYear.trim(),
})

const EntryFormModal = ({ isOpen, onClose, initialValues, onSubmit, isSubmitting, title, errorMessage }) => {
  const [values, setValues] = useState(initialValues)
  const update = (patch) => setValues((prev) => ({ ...prev, ...patch }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(values)
        }}
        className="space-y-4"
      >
        {errorMessage && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
            <select
              value={values.dayOfWeek}
              onChange={(event) => update({ dayOfWeek: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
            <input
              required
              type="time"
              value={values.startTime}
              onChange={(event) => update({ startTime: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
            <input
              required
              type="time"
              value={values.endTime}
              onChange={(event) => update({ endTime: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
          <input
            required
            value={values.subject}
            onChange={(event) => update({ subject: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Class Section</label>
            <input
              required
              value={values.classSection}
              onChange={(event) => update({ classSection: event.target.value })}
              placeholder="CSE-3A"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Faculty</label>
            <input
              required
              value={values.facultyName}
              onChange={(event) => update({ facultyName: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Semester</label>
            <input
              required
              type="number"
              min={0}
              max={12}
              value={values.semester}
              onChange={(event) => update({ semester: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Academic Year</label>
            <input
              required
              value={values.academicYear}
              onChange={(event) => update({ academicYear: event.target.value })}
              placeholder="2025-26"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const ManageTimetablePage = () => {
  const adminType = useAuthStore((state) => state.adminType)
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const { data: resources = [] } = useResources({})
  const [resourceId, setResourceId] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'add' | { entry }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [submitError, setSubmitError] = useState('')

  const openModal = (mode) => {
    setSubmitError('')
    setModalMode(mode)
  }

  const effectiveResourceId = resourceId || resources[0]?._id || ''

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timetable', effectiveResourceId],
    queryFn: () => getResourceTimetableEntries(effectiveResourceId),
    select: (res) => res.data?.entries ?? [],
    enabled: Boolean(effectiveResourceId),
  })

  const invalidateEntries = () => queryClient.invalidateQueries({ queryKey: ['timetable', effectiveResourceId] })

  const addMutation = useMutation({
    mutationFn: (payload) => addTimetableEntry({ ...payload, resourceId: effectiveResourceId }),
    onSuccess: () => {
      toast.success('Entry added')
      setModalMode(null)
      invalidateEntries()
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not add entry'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateTimetableEntry(id, payload),
    onSuccess: () => {
      toast.success('Entry updated')
      setModalMode(null)
      invalidateEntries()
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not update entry'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTimetableEntry(id),
    onSuccess: () => {
      toast.success('Entry removed')
      setDeleteTarget(null)
      invalidateEntries()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not remove entry'),
  })

  const uploadMutation = useMutation({
    mutationFn: (file) => bulkUploadTimetable(file),
    onSuccess: (res) => {
      const { inserted = 0, updated = 0, errors = [] } = res.data || {}
      setUploadResult({ inserted, updated, errors })
      toast.success(`Bulk upload processed — ${inserted} inserted, ${updated} updated`)
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Bulk upload failed'),
  })

  if (adminType !== 'super_admin') return <Navigate to="/dashboard" replace />

  const editingEntry = modalMode && modalMode !== 'add' ? modalMode.entry : null

  const handleSubmit = (values) => {
    setSubmitError('')
    const payload = toPayload(values)
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry._id, payload })
    } else {
      addMutation.mutate(payload)
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    event.target.value = ''
  }

  return (
    <div className="manage-timetable-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Timetable</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload size={16} />
            {uploadMutation.isPending ? 'Uploading…' : 'Upload CSV'}
          </Button>
          <Button onClick={() => openModal('add')} disabled={!effectiveResourceId}>
            <Plus size={16} />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Resource</label>
        <select
          value={effectiveResourceId}
          onChange={(event) => setResourceId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {resources.map((resource) => (
            <option key={resource._id} value={resource._id}>
              {resource.name}
            </option>
          ))}
        </select>
      </div>

      {uploadResult && (
        <div className="upload-result mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p>
            {uploadResult.inserted} inserted · {uploadResult.updated} updated · {uploadResult.errors.length} errors
          </p>
          {uploadResult.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-red-600 dark:text-red-400">
              {uploadResult.errors.map((error) => (
                <li key={error.row}>
                  Row {error.row}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <CalendarX2 size={32} />
            <p className="text-sm">No timetable entries for this resource.</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {['Day', 'Start', 'End', 'Subject', 'Section', 'Faculty', ''].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.dayOfWeek}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.startTime}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.endTime}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.subject}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.classSection}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{entry.facultyName}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openModal({ entry })}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(entry)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalMode && (
        <EntryFormModal
          isOpen={Boolean(modalMode)}
          onClose={() => setModalMode(null)}
          initialValues={editingEntry ? toFormValues(editingEntry) : emptyForm}
          onSubmit={handleSubmit}
          isSubmitting={addMutation.isPending || updateMutation.isPending}
          title={editingEntry ? 'Edit Entry' : 'Add Entry'}
          errorMessage={submitError}
        />
      )}

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete entry?">
        <div className="space-y-4 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Remove {deleteTarget?.subject} ({deleteTarget?.dayOfWeek} {deleteTarget?.startTime}–{deleteTarget?.endTime})?
            This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate(deleteTarget._id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ManageTimetablePage
