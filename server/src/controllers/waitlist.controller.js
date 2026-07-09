import mongoose from 'mongoose'
import Waitlist from '../models/Waitlist.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js'
import * as waitlistService from '../services/waitlist.service.js'

const ACTIVE_STATUSES = ['waiting', 'offered']

export const joinWaitlist = async (req, res) => {
  const { resourceId, date, startTime, endTime } = req.body

  const entry = await waitlistService.joinWaitlist({ resourceId, date, startTime, endTime }, req.user.id)

  return ApiResponse.success(res, { entry }, 'Added to waitlist', 201)
}

export const getMyWaitlist = async (req, res) => {
  const entries = await Waitlist.find({ userId: req.user.id })
    .populate('resourceId', 'name type department building floor')
    .sort({ createdAt: -1 })

  return ApiResponse.success(res, { entries }, 'Waitlist entries fetched')
}

export const withdrawFromWaitlist = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Waitlist entry not found')

  const entry = await Waitlist.findById(id)
  if (!entry) throw new NotFoundError('Waitlist entry not found')
  if (entry.userId.toString() !== req.user.id) {
    throw new ForbiddenError('You can only withdraw your own waitlist entry')
  }
  if (!ACTIVE_STATUSES.includes(entry.status)) {
    throw new ConflictError(`Waitlist entry already ${entry.status}`)
  }

  const wasOffered = entry.status === 'offered'
  entry.status = 'withdrawn'
  await entry.save()

  // Withdrawing a held offer frees the slot immediately instead of making
  // the next person wait out the full 15-minute expiry window.
  if (wasOffered) {
    await waitlistService.triggerWaitlistCascade({
      resourceId: entry.resourceId,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })
  }

  return ApiResponse.success(res, { entry }, 'Withdrawn from waitlist')
}

export const confirmOffer = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Waitlist entry not found')

  const booking = await waitlistService.confirmWaitlistOffer(id, req.user.id)

  return ApiResponse.success(res, { booking }, 'Offer confirmed — slot booked', 201)
}
