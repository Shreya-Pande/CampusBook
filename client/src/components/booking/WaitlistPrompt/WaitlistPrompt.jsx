import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock3 } from 'lucide-react'
import { joinWaitlist } from '../../../api/waitlist.api'
import { formatFriendlyDate } from '../../../utils/dateUtils'
import './WaitlistPrompt.css'

const WaitlistPrompt = ({ resource, date, slot, onClose, onSuccess }) => {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => joinWaitlist({ resourceId: resource._id, date, startTime: slot.start, endTime: slot.end }),
    onSuccess: () => {
      toast.success("You're on the waitlist!")
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'my'] })
      onSuccess?.()
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not join waitlist'
      setError(message)
      toast.error(message)
    },
  })

  return (
    <div className="waitlist-prompt space-y-4 text-center">
      <Clock3 className="clock-icon mx-auto text-amber-500" size={40} />
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{resource.name} is fully booked</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatFriendlyDate(date)} · {slot.start} – {slot.end}
        </p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Join the waitlist and we&apos;ll notify you with a 15-minute window to claim the spot if it frees up.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="submit-button rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>
    </div>
  )
}

export default WaitlistPrompt
