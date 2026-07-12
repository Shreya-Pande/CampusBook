// Human-readable copy + icon variant for each of the 15 backend notification
// types (see server Notification model) — shared by ActivityFeed and
// NotificationsPanel so both stay consistent.

export const NOTIFICATION_LABELS = {
  portal_opening_soon: { title: 'Portal opening soon', description: 'The weekly booking portal opens shortly.' },
  portal_now_open: { title: 'Portal is now open', description: 'Bookings for this week are now open.' },
  portal_closed: { title: 'Portal closed', description: "This week's portal has closed." },
  booking_instant_confirmed: { title: 'Booking confirmed', description: 'Your instant booking was confirmed.' },
  booking_pending_submitted: { title: 'Request submitted', description: 'Your approval request was submitted.' },
  admin_new_request: { title: 'New request', description: 'A new request was routed to you.' },
  admin_expiry_warning: { title: 'Requests expiring soon', description: 'Pending requests will expire soon.' },
  booking_approved: { title: 'Request approved', description: 'Your request was approved.' },
  booking_rejected: { title: 'Request rejected', description: 'Your request was rejected.' },
  booking_expired: { title: 'Request expired', description: 'Portal closed before this was reviewed.' },
  booking_cancelled: { title: 'Booking cancelled', description: 'A booking was cancelled.' },
  reminder_1hr: { title: 'Upcoming booking', description: 'Your booking starts in about an hour.' },
  waitlist_offered: { title: 'Waitlist spot available', description: 'A spot opened up — claim it before it expires.' },
  waitlist_expired: { title: 'Waitlist offer expired', description: 'Your claim window passed.' },
  maintenance_alert: { title: 'Maintenance alert', description: 'A resource was marked under maintenance.' },
  resource_added: { title: 'New resource added', description: 'A new resource is now available.' },
}

// checkmark for confirmed, bell for waitlist alert, clock for everything
// in-progress/informational, X for rejected/expired/cancelled
export const NOTIFICATION_VARIANT = {
  booking_instant_confirmed: 'confirmed',
  booking_approved: 'confirmed',
  waitlist_offered: 'waitlist',
  booking_rejected: 'rejected',
  booking_expired: 'rejected',
  waitlist_expired: 'rejected',
  booking_cancelled: 'rejected',
}

export const getNotificationLabel = (type) => NOTIFICATION_LABELS[type] || { title: type, description: '' }
export const getNotificationVariant = (type) => NOTIFICATION_VARIANT[type] || 'completed'
