import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BookOpen,
  Building2,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  MapPin,
  Palette,
  Presentation,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { usePortalStore } from '../../../store/portalStore'
import { useResourceAvailability } from '../../../hooks/useAvailability'
import { canBook } from '../../../utils/permissions'
import StatusBadge from '../StatusBadge/StatusBadge'
import WishlistButton from '../WishlistButton/WishlistButton'
import './ResourceCard.css'

const TYPE_META = {
  classroom: { label: 'Classroom', icon: GraduationCap },
  lab: { label: 'Lab', icon: FlaskConical },
  auditorium: { label: 'Auditorium', icon: Presentation },
  sports_court: { label: 'Sports Court', icon: Dumbbell },
  meeting_room: { label: 'Meeting Room', icon: Users },
  conference_room: { label: 'Conference Room', icon: Building2 },
  studio: { label: 'Studio', icon: Palette },
  study_room: { label: 'Study Room', icon: BookOpen },
}

const slotsOverlap = (start1, end1, start2, end2) => start1 < end2 && start2 < end1

// Status for the specific [startTime, endTime) range the user picked — not
// the whole day — so a booked 9-10am slot doesn't make a 2-3pm request look
// unavailable. Only computed once date+startTime+endTime are all selected;
// otherwise the card stays neutral (see resolveStatus below).
const resolveRangeStatus = (resource, slots, startTime, endTime, isPendingForUser) => {
  if (resource.status === 'maintenance') return 'maintenance'
  if (isPendingForUser) return 'under_approval'

  const overlapping = (slots || []).filter((slot) => slotsOverlap(slot.start, slot.end, startTime, endTime))
  if (overlapping.some((slot) => slot.status === 'occupied')) return 'occupied'
  if (overlapping.some((slot) => slot.status === 'non_vacant')) return 'non_vacant'
  return 'vacant'
}

const getActionMeta = (status, resource) => {
  if (status === 'maintenance' || status === 'under_approval') return null
  if (status === 'occupied') return { label: 'Waitlist', flow: 'waitlist' }
  if (resource.requiresApprovalAlways || status === 'non_vacant') return { label: 'Request', flow: 'approval' }
  return { label: 'Book Now', flow: 'instant' }
}

const ResourceCard = ({
  resource,
  date,
  startTime,
  endTime,
  isPendingForUser = false,
  onAction,
  viewMode = 'grid',
}) => {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const designation = useAuthStore((state) => state.designation)
  const portalStatus = usePortalStore((state) => state.status)

  const hasFullSelection = Boolean(date && startTime && endTime)
  const { data: slots } = useResourceAvailability(resource._id, date, { enabled: hasFullSelection })

  const status = hasFullSelection
    ? resolveRangeStatus(resource, slots, startTime, endTime, isPendingForUser)
    : 'unselected'
  const action = hasFullSelection ? getActionMeta(status, resource) : null
  const typeMeta = TYPE_META[resource.type] || TYPE_META.classroom
  const TypeIcon = typeMeta.icon
  const isPortalOpen = portalStatus === 'open'
  const isAllowedForDesignation = role !== 'cr_faculty' || canBook(designation, resource.type)

  let actionDisabled = false
  let actionTitle
  let actionLabel = action?.label

  if (!hasFullSelection) {
    actionDisabled = true
    actionLabel = 'Select date and time first'
  } else if (action && isAuthenticated && role === 'cr_faculty' && !isPortalOpen) {
    actionDisabled = true
    actionTitle = 'Portal closed — opens Sunday 12 PM'
  } else if (action && isAuthenticated && role === 'cr_faculty' && !isAllowedForDesignation) {
    actionDisabled = true
    actionTitle = `${designation}s can't book ${typeMeta.label.toLowerCase()}s`
  }

  const handleAction = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!hasFullSelection || !action || actionDisabled) return

    if (!isAuthenticated) {
      toast('Login to book this resource', { icon: '🔒' })
      navigate('/login')
      return
    }
    if (role !== 'cr_faculty') return

    // BookingModal decides the actual form from the slot's own status, so
    // hand it the user's exact chosen range rather than a whole-day slot —
    // that's also what pre-fills the booking form's time fields.
    const overlappingNonVacant = (slots || []).find(
      (slot) => slot.status === 'non_vacant' && slotsOverlap(slot.start, slot.end, startTime, endTime),
    )
    const chosenSlot = { start: startTime, end: endTime, status, timetableEntry: overlappingNonVacant?.timetableEntry }
    onAction?.(resource, date, chosenSlot)
  }

  return (
    <Link
      to={`/resources/${resource._id}`}
      className={`resource-card group relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
        viewMode === 'list' ? 'flex-row items-center' : 'flex-col'
      }`}
    >
      <div
        className={`resource-card-image relative shrink-0 bg-gray-100 dark:bg-gray-800 ${
          viewMode === 'list' ? 'h-28 w-40' : 'h-40 w-full'
        }`}
      >
        {resource.images?.[0] ? (
          <img src={resource.images[0]} alt={resource.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
            <TypeIcon size={36} />
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-900/90 dark:text-gray-200">
          {typeMeta.label}
        </span>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-900/90 dark:text-gray-200">
            Cap {resource.capacity}
          </span>
          <WishlistButton resourceId={resource._id} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{resource.name}</h3>
        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={12} />
          {[resource.building, resource.floor && `Lvl ${resource.floor}`].filter(Boolean).join(', ') ||
            resource.department}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <StatusBadge status={status} />
          {(!hasFullSelection || action) &&
            (actionDisabled ? (
              <span
                title={actionTitle}
                className="action-button-disabled cursor-not-allowed rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:bg-gray-800 dark:text-gray-600"
              >
                {actionLabel}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAction}
                className="resource-action-button rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {actionLabel}
              </button>
            ))}
        </div>
      </div>
    </Link>
  )
}

export default ResourceCard
