// HTML email templates for the 15 notification types (blueprint Phase 7).
// Every exported function returns { subject, html } so notification.worker.js
// can pass the result straight to nodemailer's sendMail().

const wrapEmail = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#1e293b;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">CampusBook</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f9fafb;font-size:12px;color:#9ca3af;">
                This is an automated message from CampusBook. Please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

const p = (text) => `<p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.5;">${text}</p>`

const detailsTable = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
    ${rows
      .map(
        ([label, value]) => `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;">${label}</td>
        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;">${value}</td>
      </tr>`,
      )
      .join('')}
  </table>
`

const bookingDetails = ({ resourceName, date, startTime, endTime, status, reason }) =>
  detailsTable(
    [
      ['Resource', resourceName],
      ['Date', date],
      ['Time', `${startTime} – ${endTime}`],
      status ? ['Status', status] : null,
      reason ? ['Reason', reason] : null,
    ].filter(Boolean),
  )

export const portalOpeningSoonEmail = ({ userName }) => ({
  subject: 'CampusBook portal opens soon',
  html: wrapEmail(
    'Portal opens soon',
    `${p(`Hi ${userName || 'there'},`)}
     ${p('The weekly booking portal opens at 12:00 PM today. Get ready to book your slots for the upcoming week.')}`,
  ),
})

export const portalNowOpenEmail = ({ userName }) => ({
  subject: 'CampusBook portal is now open',
  html: wrapEmail(
    'Portal is open',
    `${p(`Hi ${userName || 'there'},`)}
     ${p('The weekly booking portal is now open for Monday–Friday bookings. Vacant rooms are first come, first served.')}`,
  ),
})

export const portalClosedEmail = ({ userName }) => ({
  subject: 'CampusBook portal has closed',
  html: wrapEmail(
    'Portal closed',
    `${p(`Hi ${userName || 'there'},`)}
     ${p("This week's booking portal has closed. It reopens next Sunday at 12:00 PM.")}`,
  ),
})

export const bookingInstantConfirmedEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Booking confirmed — ${resourceName}`,
  html: wrapEmail(
    'Booking confirmed',
    `${p(`Hi ${userName},`)}
     ${p('Your booking has been confirmed instantly — no approval was needed.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Approved' })}`,
  ),
})

export const bookingPendingSubmittedEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Request submitted — ${resourceName}`,
  html: wrapEmail(
    'Request submitted',
    `${p(`Hi ${userName},`)}
     ${p('Your approval request has been submitted and routed to the relevant approver.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Pending approval' })}`,
  ),
})

export const adminNewRequestEmail = ({
  approverName,
  requesterName,
  resourceName,
  date,
  startTime,
  endTime,
  eventName,
}) => ({
  subject: `New approval request — ${resourceName}`,
  html: wrapEmail(
    'New request awaiting your review',
    `${p(`Hi ${approverName},`)}
     ${p(`${requesterName} has requested ${resourceName}${eventName ? ` for "${eventName}"` : ''}.`)}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: `Requested by ${requesterName}` })}
     ${p('Please review this request in your CampusBook admin dashboard.')}`,
  ),
})

export const adminExpiryWarningEmail = ({ approverName, count, expiresAt }) => ({
  subject: `${count} request(s) expiring soon`,
  html: wrapEmail(
    'Pending requests expiring soon',
    `${p(`Hi ${approverName},`)}
     ${p(`You have ${count} pending request(s) that will auto-expire at ${expiresAt} when the portal closes.`)}
     ${p('Review them now to avoid automatic expiry.')}`,
  ),
})

export const bookingApprovedEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Request approved — ${resourceName}`,
  html: wrapEmail(
    'Request approved',
    `${p(`Hi ${userName},`)}
     ${p('Good news — your request has been approved.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Approved' })}`,
  ),
})

export const bookingRejectedEmail = ({ userName, resourceName, date, startTime, endTime, reason }) => ({
  subject: `Request rejected — ${resourceName}`,
  html: wrapEmail(
    'Request rejected',
    `${p(`Hi ${userName},`)}
     ${p('Unfortunately your request was not approved.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Rejected', reason: reason || 'Not specified' })}`,
  ),
})

export const bookingExpiredEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Request expired — ${resourceName}`,
  html: wrapEmail(
    'Request expired',
    `${p(`Hi ${userName},`)}
     ${p('Your request expired because the portal closed before an admin reviewed it.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Expired' })}`,
  ),
})

export const bookingCancelledEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Booking cancelled — ${resourceName}`,
  html: wrapEmail(
    'Booking cancelled',
    `${p(`Hi ${userName},`)}
     ${p('Your booking has been cancelled as requested.')}
     ${bookingDetails({ resourceName, date, startTime, endTime, status: 'Cancelled' })}`,
  ),
})

export const reminder1hrEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Reminder — ${resourceName} starts in 1 hour`,
  html: wrapEmail(
    'Upcoming booking reminder',
    `${p(`Hi ${userName},`)}
     ${p('This is a reminder that your booking starts in about 1 hour.')}
     ${bookingDetails({ resourceName, date, startTime, endTime })}`,
  ),
})

export const waitlistOfferedEmail = ({ userName, resourceName, date, startTime, endTime, offerExpiresAt }) => ({
  subject: `A spot opened up — ${resourceName}`,
  html: wrapEmail(
    'Waitlist spot available',
    `${p(`Hi ${userName},`)}
     ${p(`A spot for ${resourceName} has opened up. Claim it before the offer expires.`)}
     ${bookingDetails({
       resourceName,
       date,
       startTime,
       endTime,
       status: offerExpiresAt ? `Claim by ${new Date(offerExpiresAt).toLocaleString()}` : 'Claim within 15 minutes',
     })}`,
  ),
})

export const waitlistExpiredEmail = ({ userName, resourceName, date, startTime, endTime }) => ({
  subject: `Waitlist offer expired — ${resourceName}`,
  html: wrapEmail(
    'Waitlist offer expired',
    `${p(`Hi ${userName},`)}
     ${p("Your 15-minute window to claim the waitlist spot has passed, so it's been offered to the next person in line.")}
     ${bookingDetails({ resourceName, date, startTime, endTime })}`,
  ),
})

export const maintenanceAlertEmail = ({ resourceName }) => ({
  subject: `Maintenance alert — ${resourceName}`,
  html: wrapEmail(
    'Resource under maintenance',
    `${p(`${resourceName} has been marked under maintenance and is temporarily unavailable for booking.`)}`,
  ),
})
