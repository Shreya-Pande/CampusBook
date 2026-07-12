import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Zap } from 'lucide-react'
import { createInstantBooking } from '../../../api/booking.api'
import { formatFriendlyDate } from '../../../utils/dateUtils'
import './InstantBookingForm.css'

const InstantBookingForm = ({ resource, date, slot, onClose, onSuccess }) => {
  const queryClient = useQueryClient()
  const [purpose, setPurpose] = useState('')
  const [attendees, setAttendees] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createInstantBooking({
        resourceId: resource._id,
        date,
        startTime: slot.start,
        endTime: slot.end,
        purpose,
        attendees: attendees ? Number(attendees) : undefined,
      }),
    onSuccess: () => {
      toast.success('Room booked! Check My Bookings.')
      queryClient.invalidateQueries({ queryKey: ['resources', resource._id, 'availability', date] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] })
      onSuccess?.()
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not complete booking'
      setError(message)
      toast.error(message)
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    if (!purpose.trim()) {
      setError('Purpose is required')
      return
    }
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="instant-booking-form space-y-4">
      <div className="booking-summary rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{resource.name}</p>
        <p className="text-gray-500 dark:text-gray-400">
          {formatFriendlyDate(date)} · {slot.start} – {slot.end}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="purpose" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Purpose
        </label>
        <input
          id="purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          required
          placeholder="e.g. Doubt clearing session"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div>
        <label htmlFor="attendees" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Number of people
        </label>
        <input
          id="attendees"
          type="number"
          min={1}
          value={attendees}
          onChange={(event) => setAttendees(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Zap size={14} /> Instant — no approval needed
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="submit-button rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Booking…' : 'Confirm Booking'}
        </button>
      </div>
    </form>
  )
}

export default InstantBookingForm
