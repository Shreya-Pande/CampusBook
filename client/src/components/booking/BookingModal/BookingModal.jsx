import { useMemo } from 'react'
import { usePortalStore } from '../../../store/portalStore'
import Modal from '../../ui/Modal/Modal'
import InstantBookingForm from '../InstantBookingForm/InstantBookingForm'
import ApprovalForm from '../ApprovalForm/ApprovalForm'
import WaitlistPrompt from '../WaitlistPrompt/WaitlistPrompt'
import './BookingModal.css'

const TITLES = {
  instant: 'Book Resource',
  approval: 'Request Approval',
  waitlist: 'Join Waitlist',
  closed: 'Portal Closed',
}

// Smart modal — resource/date/slot come from the caller (ResourceCard or
// the detail page's calendar); this component alone decides which flow to
// render, per the blueprint's Flow A/B/C routing rules.
const BookingModal = ({ resource, date, slot, onClose, onSuccess }) => {
  const portalStatus = usePortalStore((state) => state.status)
  const isOpen = Boolean(resource && slot)

  const formType = useMemo(() => {
    if (!resource || !slot) return null
    if (portalStatus !== 'open') return 'closed'
    if (slot.status === 'occupied') return 'waitlist'
    if (slot.status === 'vacant' && !resource.requiresApprovalAlways) return 'instant'
    return 'approval'
  }, [resource, slot, portalStatus])

  // Each form's own success handler already fires its toast — closing the
  // modal here is what "on success ... close modal" means for all three.
  const handleSuccess = () => {
    onSuccess?.()
    onClose?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={formType ? TITLES[formType] : ''}>
      {formType === 'closed' && (
        <div className="closed-message py-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The booking portal is currently closed. It reopens every Sunday at 12:00 PM.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      )}

      {formType === 'instant' && (
        <InstantBookingForm resource={resource} date={date} slot={slot} onClose={onClose} onSuccess={handleSuccess} />
      )}

      {formType === 'approval' && (
        <ApprovalForm resource={resource} date={date} slot={slot} onClose={onClose} onSuccess={handleSuccess} />
      )}

      {formType === 'waitlist' && (
        <WaitlistPrompt resource={resource} date={date} slot={slot} onClose={onClose} onSuccess={handleSuccess} />
      )}
    </Modal>
  )
}

export default BookingModal
