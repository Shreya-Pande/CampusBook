import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, ChevronDown, ChevronUp, Inbox } from 'lucide-react'
import { usePortalStatus } from '../../../hooks/usePortalStatus'
import { getAdminRequests, approveRequest, rejectRequest } from '../../../api/admin.api'
import { formatFriendlyDate } from '../../../utils/dateUtils'
import RejectModal from '../../../components/booking/RejectModal/RejectModal'
import BookingStatusBadge from '../../../components/booking/BookingStatusBadge/BookingStatusBadge'
import Button from '../../../components/ui/Button/Button'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './BookingRequestsPage.css'

const TABS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Expired', value: 'expired' },
  { label: 'All', value: 'all' },
]

const PRIORITY_META = {
  high: { label: 'HIGH', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  medium: { label: 'MEDIUM', className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  low: { label: 'LOW', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
}

const PriorityBadge = ({ priority = 'medium' }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.className}`}>{meta.label}</span>
  )
}

// Thursday (4) and Friday (5) of the Mon-Fri booking week — the last two
// days before the Friday 5PM close, when unreviewed requests are at risk of
// auto-expiring.
const isExpiryWarningDay = () => {
  const day = new Date().getDay() // 0 Sun ... 6 Sat
  return day === 4 || day === 5
}

const ExpiryWarningBanner = ({ pendingCount, closesAt }) => {
  if (pendingCount === 0 || !isExpiryWarningDay()) return null

  return (
    <div className="expiry-banner mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        {pendingCount} request{pendingCount === 1 ? '' : 's'} will auto-expire
        {closesAt ? ` ${formatDistanceToNow(new Date(closesAt), { addSuffix: true })}` : ' when the portal closes'} if
        not reviewed.
      </span>
    </div>
  )
}

const RequestRow = ({ request, onApprove, onReject, isApproving }) => {
  const [expanded, setExpanded] = useState(false)
  const resource = Array.isArray(request.resourceIds) ? request.resourceIds[0] : request.resourceIds
  const formData = request.formData || {}
  const isPending = request.status === 'pending'

  return (
    <>
      <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 dark:text-gray-100">{request.userId?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {request.userId?.designation} · {request.userId?.department}
          </p>
        </td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{resource?.name}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatFriendlyDate(request.date)}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
          {request.startTime} – {request.endTime}
        </td>
        <td className="px-4 py-3">
          <PriorityBadge priority={formData.priority} />
        </td>
        <td className="px-4 py-3">
          <BookingStatusBadge status={request.status} bookingType={request.bookingType} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
              Details {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            {isPending && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onApprove(request._id)}
                  disabled={isApproving}
                  className="!bg-emerald-600 hover:!bg-emerald-700"
                >
                  Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => onReject(request)}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Event Name</p>
                <p className="text-gray-900 dark:text-gray-100">{formData.eventName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Organizing Body</p>
                <p className="text-gray-900 dark:text-gray-100">{formData.organizingBody || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Expected Attendees</p>
                <p className="text-gray-900 dark:text-gray-100">{formData.expectedAttendees ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Faculty In-Charge</p>
                <p className="text-gray-900 dark:text-gray-100">{formData.facultyInCharge || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Notes</p>
                <p className="text-gray-900 dark:text-gray-100">{formData.additionalNotes || '—'}</p>
              </div>
              {request.status === 'rejected' && request.rejectionReason && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Rejection Reason</p>
                  <p className="text-red-700 dark:text-red-300">{request.rejectionReason}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const BookingRequestsPage = () => {
  const queryClient = useQueryClient()
  const { nextClose } = usePortalStatus()
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectError, setRejectError] = useState('')

  const openRejectModal = (request) => {
    setRejectError('')
    setRejectTarget(request)
  }

  const closeRejectModal = () => {
    setRejectError('')
    setRejectTarget(null)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'requests', activeTab],
    queryFn: () => getAdminRequests({ status: activeTab, limit: 100 }),
    select: (res) => res.data,
  })
  const requests = data?.requests ?? []

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin', 'requests', 'pending', 'count'],
    queryFn: () => getAdminRequests({ status: 'pending', limit: 1 }),
    select: (res) => res.data?.total ?? 0,
  })

  const approveMutation = useMutation({
    mutationFn: (id) => approveRequest(id, {}),
    onSuccess: () => {
      toast.success('Request approved')
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not approve request'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('Request rejected')
      setRejectTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] })
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not reject request'
      setRejectError(message)
      toast.error(message)
    },
  })

  const columns = useMemo(
    () => ['Applicant', 'Resource', 'Date', 'Time', 'Priority', 'Status', ''],
    [],
  )

  return (
    <div className="booking-requests-page">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Booking Requests</h1>

      <ExpiryWarningBanner pendingCount={pendingCount} closesAt={nextClose} />

      <div className="tabs-row mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`request-tab border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.value
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Couldn&apos;t load requests.</p>
        ) : requests.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <Inbox size={32} />
            <p className="text-sm">No requests here.</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <RequestRow
                  key={request._id}
                  request={request}
                  onApprove={approveMutation.mutate}
                  onReject={openRejectModal}
                  isApproving={approveMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RejectModal
        isOpen={Boolean(rejectTarget)}
        onClose={closeRejectModal}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget._id, reason })}
        isSubmitting={rejectMutation.isPending}
        title={rejectTarget ? `Reject: ${rejectTarget.resourceIds?.[0]?.name || 'request'} — ${rejectTarget.userId?.name || ''}` : 'Reject request'}
        errorMessage={rejectError}
      />
    </div>
  )
}

export default BookingRequestsPage
