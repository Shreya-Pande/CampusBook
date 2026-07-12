import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ListChecks, MapPin } from 'lucide-react'
import { useMyWaitlist } from '../../../hooks/useWaitlist'
import { confirmWaitlistOffer, withdrawFromWaitlist } from '../../../api/waitlist.api'
import { useCountdown } from '../../../hooks/useCountdown'
import { formatFriendlyDate } from '../../../utils/dateUtils'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './MyWaitlistPage.css'

const ACTIVE_STATUSES = ['waiting', 'offered']

const STATUS_META = {
  waiting: { label: 'Waiting', text: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800' },
  offered: { label: 'Offered', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950' },
  confirmed: { label: 'Confirmed', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  expired: { label: 'Expired', text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900' },
  withdrawn: { label: 'Withdrawn', text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900' },
}

const pad = (n) => String(n).padStart(2, '0')

const OfferCountdown = ({ targetDate }) => {
  const timeLeft = useCountdown(targetDate)
  if (!timeLeft) return <span className="text-xs text-gray-400 dark:text-gray-500">Offer expired</span>

  const { hours, minutes, seconds } = timeLeft
  return (
    <span className="offer-countdown font-mono text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)} left to confirm
    </span>
  )
}

const WaitlistEntry = ({ entry }) => {
  const queryClient = useQueryClient()
  const meta = STATUS_META[entry.status] || STATUS_META.waiting
  const canWithdraw = ACTIVE_STATUSES.includes(entry.status)
  const canConfirm = entry.status === 'offered'

  const confirmMutation = useMutation({
    mutationFn: () => confirmWaitlistOffer(entry._id),
    onSuccess: () => {
      toast.success('Slot confirmed — check My Bookings.')
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not confirm offer'),
  })

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawFromWaitlist(entry._id),
    onSuccess: () => {
      toast.success('Withdrawn from waitlist')
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'my'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not withdraw'),
  })

  return (
    <div className="waitlist-entry rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <span className="position-chip rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              #{entry.position}
            </span>
            {entry.resourceId?.name || 'Resource'}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{formatFriendlyDate(entry.date)}</span>
            <span>
              {entry.startTime} – {entry.endTime}
            </span>
          </p>
          {(entry.resourceId?.building || entry.resourceId?.department) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <MapPin size={12} />
              {[entry.resourceId.building, entry.resourceId.floor && `Lvl ${entry.resourceId.floor}`]
                .filter(Boolean)
                .join(', ') || entry.resourceId.department}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
      </div>

      {canConfirm && (
        <div className="mt-3">
          <OfferCountdown targetDate={entry.offerExpiresAt} />
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {canConfirm && (
          <button
            type="button"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
          </button>
        )}
        {canWithdraw && (
          <button
            type="button"
            onClick={() => withdrawMutation.mutate()}
            disabled={withdrawMutation.isPending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {withdrawMutation.isPending ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
      </div>
    </div>
  )
}

const MyWaitlistPage = () => {
  const { data: entries = [], isLoading } = useMyWaitlist()

  return (
    <div className="my-waitlist-page">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Waitlist</h1>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : entries.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <ListChecks size={32} />
            <p className="text-sm">You&apos;re not on any waitlists right now.</p>
          </div>
        ) : (
          entries.map((entry) => <WaitlistEntry key={entry._id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

export default MyWaitlistPage
