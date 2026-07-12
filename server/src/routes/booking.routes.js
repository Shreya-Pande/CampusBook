import { Router } from 'express'
import * as bookingController from '../controllers/booking.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/rbac.middleware.js'
import { windowGuard } from '../middleware/windowGuard.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { bookingLimiter } from '../middleware/rateLimit.middleware.js'
import {
  instantBookingSchema,
  approvalBookingSchema,
  multiRoomBookingSchema,
} from '../validators/booking.validators.js'

const router = Router()

// All booking endpoints — reads and writes alike — sit behind the portal
// window: browsing/managing bookings for a closed week happens through the
// archived-history views, not this router.
router.use(verifyToken)
router.use(windowGuard)

router.post(
  '/instant',
  bookingLimiter,
  authorize('cr_faculty'),
  validate(instantBookingSchema),
  bookingController.createInstant,
)

router.post(
  '/request',
  bookingLimiter,
  authorize('cr_faculty'),
  validate(approvalBookingSchema),
  bookingController.createRequest,
)

router.post(
  '/multi-room',
  bookingLimiter,
  authorize('cr_faculty'),
  validate(multiRoomBookingSchema),
  bookingController.createMultiRoom,
)

router.get('/my', bookingController.getMyBookings)
router.get('/my/all', bookingController.getMyAllBookings)
router.get('/:id', bookingController.getBookingById)
router.delete('/:id', bookingController.cancelBooking)

export default router
