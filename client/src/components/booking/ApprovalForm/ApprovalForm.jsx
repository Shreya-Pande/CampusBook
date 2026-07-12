import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import { createApprovalBooking } from '../../../api/booking.api'
import { formatFriendlyDate } from '../../../utils/dateUtils'
import './ApprovalForm.css'

const PRIORITIES = ['low', 'medium', 'high']

const initialForm = {
  eventName: '',
  organizingBody: '',
  expectedAttendees: '',
  facultyInCharge: '',
  priority: 'medium',
  additionalNotes: '',
}

// Blueprint Flow B — approval-required requests (non-vacant slot or a
// resource that always needs approval regardless of the timetable).
const ApprovalForm = ({ resource, date, slot, onClose, onSuccess }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const mutation = useMutation({
    mutationFn: () =>
      createApprovalBooking({
        resourceId: resource._id,
        date,
        startTime: slot.start,
        endTime: slot.end,
        formData: {
          ...form,
          // Backend's Joi schema treats an empty string as an invalid value
          // for optional string fields (only additionalNotes allows ''), so
          // omit rather than send blanks through as ''.
          expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : undefined,
          facultyInCharge: form.facultyInCharge.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Request submitted — approver notified')
      queryClient.invalidateQueries({ queryKey: ['resources', resource._id, 'availability', date] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] })
      onSuccess?.()
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Could not submit request'
      setError(message)
      toast.error(message)
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    if (!form.eventName.trim() || !form.organizingBody.trim()) {
      setError('Event name and organizing body are required')
      return
    }
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="approval-form space-y-4">
      <div className="booking-summary rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{resource.name}</p>
        <p className="text-gray-500 dark:text-gray-400">
          {formatFriendlyDate(date)} · {slot.start} – {slot.end}
        </p>
      </div>

      {slot.status === 'non_vacant' && slot.timetableEntry && (
        <div className="occupying-class-notice flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            Scheduled class: <strong>{slot.timetableEntry.subject}</strong> · {slot.timetableEntry.classSection} ·{' '}
            {slot.timetableEntry.facultyName}. Approval from the department admin is required.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="eventName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Event / Purpose
        </label>
        <input
          id="eventName"
          name="eventName"
          value={form.eventName}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div>
        <label htmlFor="organizingBody" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Organizing Body
        </label>
        <input
          id="organizingBody"
          name="organizingBody"
          value={form.organizingBody}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="expectedAttendees"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Expected Attendees
          </label>
          <input
            id="expectedAttendees"
            name="expectedAttendees"
            type="number"
            min={1}
            value={form.expectedAttendees}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor="facultyInCharge"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Faculty In-Charge
          </label>
          <input
            id="facultyInCharge"
            name="facultyInCharge"
            value={form.facultyInCharge}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</span>
        <div className="flex gap-2">
          {PRIORITIES.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, priority: level }))}
              className={`priority-option flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                form.priority === level
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-indigo-300 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="additionalNotes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes
        </label>
        <textarea
          id="additionalNotes"
          name="additionalNotes"
          value={form.additionalNotes}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

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
          {mutation.isPending ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </form>
  )
}

export default ApprovalForm
