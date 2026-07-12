import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Plus, Shield } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import {
  getRoutingConfig,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  getAllUsers,
} from '../../../api/admin.api'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './ApprovalRoutingPage.css'

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

const BOOKING_TYPES = ['non_vacant', 'approval_required', 'all']

const emptyForm = { department: '', resourceType: 'classroom', bookingType: 'non_vacant', approverId: '' }

const toFormValues = (rule) => ({
  department: rule.department,
  resourceType: rule.resourceType,
  bookingType: rule.bookingType,
  approverId: rule.approverId?._id || '',
})

const RuleFormModal = ({ isOpen, onClose, initialValues, onSubmit, isSubmitting, title, approvers, errorMessage }) => {
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
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
          <input
            required
            value={values.department}
            onChange={(event) => update({ department: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Resource Type</label>
            <select
              value={values.resourceType}
              onChange={(event) => update({ resourceType: event.target.value })}
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
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Booking Type</label>
            <select
              value={values.bookingType}
              onChange={(event) => update({ bookingType: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {BOOKING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Approver</label>
          <select
            required
            value={values.approverId}
            onChange={(event) => update({ approverId: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select an approver…</option>
            {approvers.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const ApprovalRoutingPage = () => {
  const adminType = useAuthStore((state) => state.adminType)
  const queryClient = useQueryClient()
  const [modalMode, setModalMode] = useState(null) // null | 'add' | { rule }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitError, setSubmitError] = useState('')

  const openModal = (mode) => {
    setSubmitError('')
    setModalMode(mode)
  }

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['admin', 'routing'],
    queryFn: getRoutingConfig,
    select: (res) => res.data?.rules ?? [],
  })

  const { data: approvers = [] } = useQuery({
    queryKey: ['admin', 'users', 'admin-role'],
    queryFn: () => getAllUsers({ role: 'admin', limit: 100 }),
    select: (res) => res.data?.users ?? [],
  })

  const createMutation = useMutation({
    mutationFn: createRoutingRule,
    onSuccess: () => {
      toast.success('Routing rule created')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'routing'] })
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not create rule'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateRoutingRule(id, payload),
    onSuccess: () => {
      toast.success('Routing rule updated')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'routing'] })
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not update rule'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRoutingRule(id),
    onSuccess: () => {
      toast.success('Routing rule deleted')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'routing'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete rule'),
  })

  if (adminType !== 'super_admin') return <Navigate to="/dashboard" replace />

  const editingRule = modalMode && modalMode !== 'add' ? modalMode.rule : null

  const handleSubmit = (values) => {
    setSubmitError('')
    if (editingRule) {
      updateMutation.mutate({ id: editingRule._id, payload: values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <div className="approval-routing-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Approval Routing</h1>
        <Button onClick={() => openModal('add')}>
          <Plus size={16} />
          Add Rule
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <Shield size={32} />
            <p className="text-sm">No routing rules configured.</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {['Department', 'Resource Type', 'Booking Type', 'Approver', ''].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule._id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{rule.department}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{rule.resourceType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{rule.bookingType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    <p>{rule.approverId?.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{rule.approverId?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openModal({ rule })}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(rule)}>
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
        <RuleFormModal
          isOpen={Boolean(modalMode)}
          onClose={() => setModalMode(null)}
          initialValues={editingRule ? toFormValues(editingRule) : emptyForm}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          title={editingRule ? 'Edit Rule' : 'Add Rule'}
          approvers={approvers}
          errorMessage={submitError}
        />
      )}

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete this rule?">
        <div className="space-y-4 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Remove the routing rule for {deleteTarget?.department} / {deleteTarget?.resourceType}? This can&apos;t be
            undone.
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

export default ApprovalRoutingPage
