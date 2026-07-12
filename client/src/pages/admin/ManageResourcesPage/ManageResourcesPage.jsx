import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Building2, Plus } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { getResources, createResource, updateResource, setResourceStatus } from '../../../api/resource.api'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './ManageResourcesPage.css'

const RESOURCE_TYPES = [
  'classroom',
  'lab',
  'auditorium',
  'sports_court',
  'meeting_room',
  'conference_room',
  'studio',
  'study_room',
]

const STATUS_CYCLE = ['active', 'maintenance', 'inactive']

const STATUS_META = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  maintenance: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

const emptyForm = {
  name: '',
  type: 'classroom',
  department: '',
  building: '',
  floor: '',
  capacity: '',
  amenities: '',
  images: '',
  requiresApprovalAlways: false,
  status: 'active',
}

const toFormValues = (resource) => ({
  name: resource.name || '',
  type: resource.type || 'classroom',
  department: resource.department || '',
  building: resource.building || '',
  floor: resource.floor || '',
  capacity: String(resource.capacity ?? ''),
  amenities: (resource.amenities || []).join(', '),
  images: (resource.images || []).join(', '),
  requiresApprovalAlways: Boolean(resource.requiresApprovalAlways),
  status: resource.status || 'active',
})

const toPayload = (values) => ({
  name: values.name.trim(),
  type: values.type,
  department: values.department.trim(),
  building: values.building.trim() || undefined,
  floor: values.floor.trim() || undefined,
  capacity: Number(values.capacity),
  amenities: values.amenities
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean),
  images: values.images
    .split(',')
    .map((i) => i.trim())
    .filter(Boolean),
  requiresApprovalAlways: values.requiresApprovalAlways,
  status: values.status,
})

const ResourceFormModal = ({ isOpen, onClose, initialValues, onSubmit, isSubmitting, title, errorMessage }) => {
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

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <input
            required
            value={values.name}
            onChange={(event) => update({ name: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select
              value={values.type}
              onChange={(event) => update({ type: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
            <input
              required
              value={values.department}
              onChange={(event) => update({ department: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Building</label>
            <input
              value={values.building}
              onChange={(event) => update({ building: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Floor</label>
            <input
              value={values.floor}
              onChange={(event) => update({ floor: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
            <input
              required
              type="number"
              min={1}
              value={values.capacity}
              onChange={(event) => update({ capacity: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amenities (comma separated)
          </label>
          <input
            value={values.amenities}
            onChange={(event) => update({ amenities: event.target.value })}
            placeholder="projector, whiteboard, ac"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Image URLs (comma separated)
          </label>
          <input
            value={values.images}
            onChange={(event) => update({ images: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={values.requiresApprovalAlways}
              onChange={(event) => update({ requiresApprovalAlways: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Always requires approval
          </label>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              value={values.status}
              onChange={(event) => update({ status: event.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {STATUS_CYCLE.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const ManageResourcesPage = () => {
  const adminType = useAuthStore((state) => state.adminType)
  const queryClient = useQueryClient()
  const [modalMode, setModalMode] = useState(null) // null | 'add' | { resource }
  const [submitError, setSubmitError] = useState('')

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', 'admin', 'all'],
    queryFn: () => getResources({}),
    select: (res) => res.data?.resources ?? [],
  })

  const openModal = (mode) => {
    setSubmitError('')
    setModalMode(mode)
  }

  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      toast.success('Resource created')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not create resource'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateResource(id, payload),
    onSuccess: () => {
      toast.success('Resource updated')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not update resource'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => setResourceStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update status'),
  })

  if (adminType !== 'super_admin') return <Navigate to="/dashboard" replace />

  const editingResource = modalMode && modalMode !== 'add' ? modalMode.resource : null

  const handleSubmit = (values) => {
    setSubmitError('')
    const payload = toPayload(values)
    if (editingResource) {
      updateMutation.mutate({ id: editingResource._id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const cycleStatus = (resource) => {
    const currentIndex = STATUS_CYCLE.indexOf(resource.status)
    const next = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]
    statusMutation.mutate({ id: resource._id, status: next })
  }

  return (
    <div className="manage-resources-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Resources</h1>
        <Button onClick={() => openModal('add')}>
          <Plus size={16} />
          Add Resource
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <Building2 size={32} />
            <p className="text-sm">No resources yet — add your first one.</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {['Name', 'Type', 'Department', 'Building', 'Floor', 'Capacity', 'Status', ''].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr
                  key={resource._id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{resource.name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource.department}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource.building || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource.floor || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource.capacity}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => cycleStatus(resource)}
                      disabled={statusMutation.isPending}
                      title="Click to cycle status"
                      className={`status-cycle-btn rounded-full px-2.5 py-1 text-xs font-semibold capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
                        STATUS_META[resource.status] || STATUS_META.active
                      }`}
                    >
                      {resource.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openModal({ resource })}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalMode && (
        <ResourceFormModal
          isOpen={Boolean(modalMode)}
          onClose={() => setModalMode(null)}
          initialValues={editingResource ? toFormValues(editingResource) : emptyForm}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          title={editingResource ? `Edit ${editingResource.name}` : 'Add Resource'}
          errorMessage={submitError}
        />
      )}
    </div>
  )
}

export default ManageResourcesPage
