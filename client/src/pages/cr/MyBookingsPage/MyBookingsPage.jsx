import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarX2 } from 'lucide-react'
import { useMyBookings } from '../../../hooks/useBookings'
import { getMyAllBookings } from '../../../api/booking.api'
import { toIsoDate } from '../../../utils/dateUtils'
import BookingCard from '../../../components/booking/BookingCard/BookingCard'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './MyBookingsPage.css'

const TABS = ['All', 'Upcoming', 'Pending', 'Approved', 'Rejected', 'Expired', 'Archived']

const filterForTab = (bookings, tab) => {
  const today = toIsoDate(new Date())
  switch (tab) {
    case 'Upcoming':
      return bookings.filter((b) => b.status === 'approved' && toIsoDate(b.date) >= today)
    case 'Pending':
      return bookings.filter((b) => b.status === 'pending')
    case 'Approved':
      return bookings.filter((b) => b.status === 'approved')
    case 'Rejected':
      return bookings.filter((b) => b.status === 'rejected')
    case 'Expired':
      return bookings.filter((b) => b.status === 'expired')
    default:
      return bookings
  }
}

const MyBookingsPage = () => {
  const [activeTab, setActiveTab] = useState('All')
  const isArchivedTab = activeTab === 'Archived'

  const { data: current = [], isLoading: currentLoading } = useMyBookings({}, { enabled: !isArchivedTab })
  const { data: archived = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['bookings', 'my', 'all'],
    queryFn: getMyAllBookings,
    select: (res) => res.data?.archived ?? [],
    enabled: isArchivedTab,
  })

  const visibleBookings = useMemo(
    () => (isArchivedTab ? archived : filterForTab(current, activeTab)),
    [isArchivedTab, archived, current, activeTab],
  )
  const isLoading = isArchivedTab ? archivedLoading : currentLoading

  return (
    <div className="my-bookings-page">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>

      <div className="tabs-row mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`booking-tab border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : visibleBookings.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <CalendarX2 size={32} />
            <p className="text-sm">No bookings here yet.</p>
          </div>
        ) : (
          visibleBookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} readOnly={isArchivedTab} />
          ))
        )}
      </div>
    </div>
  )
}

export default MyBookingsPage
