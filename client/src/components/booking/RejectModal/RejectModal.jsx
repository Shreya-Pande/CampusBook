import { useState } from 'react'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import './RejectModal.css'

const MIN_REASON_LENGTH = 20

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  title = 'Reject request',
  errorMessage = '',
}) => {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= MIN_REASON_LENGTH

  const handleClose = () => {
    setReason('')
    onClose?.()
  }

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm?.(reason.trim())
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-3">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div>
          <label htmlFor="reject-reason" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rejection Reason (min {MIN_REASON_LENGTH} chars)
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this request is being rejected…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <p
            className={`char-counter mt-1 text-right text-xs ${
              isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {reason.trim().length}/{MIN_REASON_LENGTH}
          </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">This will be sent to the requester.</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Rejecting…' : 'Confirm Rejection'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default RejectModal
