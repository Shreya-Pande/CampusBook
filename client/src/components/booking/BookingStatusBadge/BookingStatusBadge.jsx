import './BookingStatusBadge.css'

// The Booking schema's `status` enum has only 7 values — 'approved' covers
// both HOD-approved requests and instantly-confirmed bookings. The blueprint
// calls for 8 visually distinct badges (green Approved vs blue Booked), so
// bookingType disambiguates the two 'approved' cases here.
const STATUS_META = {
  pending: { label: 'Pending Approval', dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  approved: { label: 'Approved', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  booked: { label: 'Booked', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950' },
  completed: { label: 'Completed', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-950' },
  rejected: { label: 'Rejected', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800' },
  expired: { label: 'Expired', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950' },
  archived: { label: 'Archived', dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900' },
}

// status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled' | 'expired' | 'archived'
// bookingType: 'instant' | 'approval_required' — only used to pick the
// approved/booked variant apart.
const BookingStatusBadge = ({ status, bookingType }) => {
  const key = status === 'approved' && bookingType === 'instant' ? 'booked' : status
  const meta = STATUS_META[key] || STATUS_META.pending

  return (
    <span
      className={`booking-status-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}
    >
      <span className={`booking-status-dot h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default BookingStatusBadge
