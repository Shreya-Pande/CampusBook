import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { Building2, MapPin } from 'lucide-react'
import { cancelBooking } from '../../../api/booking.api'
import { formatFriendlyDate, toIsoDate } from '../../../utils/dateUtils'
import Modal from '../../ui/Modal/Modal'
import BookingStatusBadge from '../BookingStatusBadge/BookingStatusBadge'
import './BookingCard.css'

const CANCELLABLE_STATUSES = ['pending', 'approved']

// readOnly: true for entries from the Archived tab (BookingArchive keeps the
// booking's original pre-archive status, e.g. 'approved' — not a literal
// 'archived' value — so the badge is forced here and Cancel is always hidden).
const BookingCard = ({ booking, readOnly = false }) => {
  const queryClient = useQueryClient()
  const [showDetails, setShowDetails] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  const resource = Array.isArray(booking.resourceIds) ? booking.resourceIds[0] : booking.resourceIds
  const formData = booking.formData || {}
  const canCancel = !readOnly && CANCELLABLE_STATUSES.includes(booking.status)
  const displayStatus = readOnly ? 'archived' : booking.status

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(booking._id),
    onSuccess: () => {
      toast.success('Booking cancelled')
      setShowConfirmCancel(false)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      if (resource?._id) {
        queryClient.invalidateQueries({
          queryKey: ['resources', resource._id, 'availability', toIsoDate(booking.date)],
        })
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not cancel booking')
    },
  })

  return (
    <div className="booking-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {resource?.name || 'Resource'}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{formatFriendlyDate(booking.date)}</span>
            <span>
              {booking.startTime} – {booking.endTime}
            </span>
          </p>
          {formData.eventName && (
            <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">{formData.eventName}</p>
          )}
          {(resource?.building || resource?.department) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <MapPin size={12} />
              {[resource.building, resource.floor && `Lvl ${resource.floor}`].filter(Boolean).join(', ') ||
                resource.department}
            </p>
          )}
        </div>
        <BookingStatusBadge status={displayStatus} bookingType={booking.bookingType} />
      </div>

      {booking.status === 'pending' && booking.assignedApproverId?.name && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Building2 size={12} />
          Routed to {booking.assignedApproverId.name}
        </p>
      )}

      {booking.status === 'rejected' && booking.rejectionReason && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {booking.rejectionReason}
        </p>
      )}

      {booking.status === 'expired' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Portal closed before admin reviewed
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Submitted {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            View Details
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowConfirmCancel(true)}
              className="cancel-booking-btn rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={resource?.name || 'Booking details'}>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Date</p>
              <p className="text-gray-900 dark:text-gray-100">{formatFriendlyDate(booking.date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Time</p>
              <p className="text-gray-900 dark:text-gray-100">
                {booking.startTime} – {booking.endTime}
              </p>
            </div>
          </div>
          {formData.eventName && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Event / Purpose</p>
              <p className="text-gray-900 dark:text-gray-100">{formData.eventName}</p>
            </div>
          )}
          {formData.organizingBody && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Organizing Body</p>
              <p className="text-gray-900 dark:text-gray-100">{formData.organizingBody}</p>
            </div>
          )}
          {formData.expectedAttendees != null && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Expected Attendees</p>
              <p className="text-gray-900 dark:text-gray-100">{formData.expectedAttendees}</p>
            </div>
          )}
          {formData.facultyInCharge && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Faculty In-Charge</p>
              <p className="text-gray-900 dark:text-gray-100">{formData.facultyInCharge}</p>
            </div>
          )}
          {formData.additionalNotes && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Notes</p>
              <p className="text-gray-900 dark:text-gray-100">{formData.additionalNotes}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Status</p>
            <div className="mt-1">
              <BookingStatusBadge status={displayStatus} bookingType={booking.bookingType} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showConfirmCancel} onClose={() => setShowConfirmCancel(false)} title="Cancel this booking?">
        <div className="space-y-4 text-sm">
          <p className="text-gray-600 dark:text-gray-300">This can&apos;t be undone.</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowConfirmCancel(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Keep Booking
            </button>
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default BookingCard
