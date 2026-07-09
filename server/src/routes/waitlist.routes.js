import { Router } from 'express'
import * as waitlistController from '../controllers/waitlist.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import { windowGuard } from '../middleware/windowGuard.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { joinWaitlistSchema } from '../validators/waitlist.validators.js'

const router = Router()

router.use(verifyToken)

router.post('/', validate(joinWaitlistSchema), waitlistController.joinWaitlist)
router.get('/my', waitlistController.getMyWaitlist)
router.delete('/:id', waitlistController.withdrawFromWaitlist)
router.post('/:id/confirm', windowGuard, waitlistController.confirmOffer)

export default router
