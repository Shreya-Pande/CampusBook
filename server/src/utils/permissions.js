// Designation -> resource types a CR/TnP/Faculty-tier user may request.
// Sourced from the Booking Decision Matrix (Section 2), which is the more
// complete spec than the Phase 1 sketch — notably it grants CR-tier
// designations sports_court ("Sports Court | Any | ❌ | ✅ Approval | ✅ | ✅"),
// which the Phase 1 code snippet omitted.
const PERMISSIONS = {
  CR: ['classroom', 'sports_court'],
  'Club Head': ['classroom', 'sports_court'],
  'Event Head': ['classroom', 'sports_court'],
  'TnP Officer': ['classroom', 'lab', 'meeting_room', 'conference_room', 'sports_court'],
  Faculty: [
    'classroom',
    'lab',
    'meeting_room',
    'conference_room',
    'auditorium',
    'studio',
    'sports_court',
  ],
}

export const canBook = (designation, resourceType) =>
  (PERMISSIONS[designation] || []).includes(resourceType)

export default canBook
