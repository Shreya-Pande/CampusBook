// Client-side mirror of server/src/utils/permissions.js — used only to
// shape the UI (hide/disable actions a request would be rejected for
// anyway); the backend remains the source of truth and re-checks this.
const PERMISSIONS = {
  CR: ['classroom', 'sports_court'],
  'Club Head': ['classroom', 'sports_court'],
  'Event Head': ['classroom', 'sports_court'],
  'TnP Officer': ['classroom', 'lab', 'meeting_room', 'conference_room', 'sports_court'],
  Faculty: ['classroom', 'lab', 'meeting_room', 'conference_room', 'auditorium', 'studio', 'sports_court'],
}

export const canBook = (designation, resourceType) => (PERMISSIONS[designation] || []).includes(resourceType)

export default canBook
