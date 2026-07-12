import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Building2,
  Cpu,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  ImageOff,
  MonitorPlay,
  Palette,
  PenSquare,
  Plug,
  Presentation,
  Snowflake,
  Users,
} from 'lucide-react'
import { getResourceById } from '../../api/resource.api'
import { usePortalStatus } from '../../hooks/usePortalStatus'
import { usePortalStore } from '../../store/portalStore'
import { useAuthStore } from '../../store/authStore'
import { useResourceAvailability } from '../../hooks/useAvailability'
import { useMyBookings } from '../../hooks/useBookings'
import { canBook } from '../../utils/permissions'
import { getWeekdayDates, toIsoDate } from '../../utils/dateUtils'
import WeekDateTabs from '../../components/portal/WeekDateTabs/WeekDateTabs'
import WishlistButton from '../../components/resources/WishlistButton/WishlistButton'
import BookingModal from '../../components/booking/BookingModal/BookingModal'
import Skeleton from '../../components/ui/Skeleton/Skeleton'
import './ResourceDetailPage.css'

const HISTORY_STORAGE_KEY = 'campusbook-resource-history'
const HISTORY_LIMIT = 10

const TYPE_META = {
  classroom: { label: 'Classroom', icon: GraduationCap },
  lab: { label: 'Lab', icon: FlaskConical },
  auditorium: { label: 'Auditorium', icon: Presentation },
  sports_court: { label: 'Sports Court', icon: Dumbbell },
  meeting_room: { label: 'Meeting Room', icon: Users },
  conference_room: { label: 'Conference Room', icon: Building2 },
  studio: { label: 'Studio', icon: Palette },
  study_room: { label: 'Study Room', icon: GraduationCap },
}

const AMENITY_META = {
  projector: { label: 'Projector', icon: MonitorPlay },
  whiteboard: { label: 'Whiteboard', icon: PenSquare },
  ac: { label: 'AC', icon: Snowflake },
  computers: { label: 'Computers', icon: Cpu },
  power_outlets: { label: 'Power Outlets', icon: Plug },
}

const STATUS_COLORS = {
  vacant: '#10b981',
  non_vacant: '#3b82f6',
  occupied: '#ef4444',
}

const recordVisit = (resourceId) => {
  const existing = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
  const next = [resourceId, ...existing.filter((id) => id !== resourceId)].slice(0, HISTORY_LIMIT)
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
}

const ResourceDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  usePortalStatus() // hydrates portalStore for this (public) page
  const portalStatus = usePortalStore((state) => state.status)
  const currentWeek = usePortalStore((state) => state.currentWeek)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const designation = useAuthStore((state) => state.designation)

  const [selectedDate, setSelectedDate] = useState('')
  const [activeBooking, setActiveBooking] = useState(null)

  const {
    data: resource,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['resources', id],
    queryFn: () => getResourceById(id),
    select: (res) => res.data?.resource,
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (resource) recordVisit(resource._id)
  }, [resource])

  const weekDates = useMemo(() => getWeekdayDates(currentWeek?.weekStartDate), [currentWeek])
  useEffect(() => {
    if (!selectedDate && weekDates.length > 0) {
      const todayIso = toIsoDate(new Date())
      setSelectedDate((weekDates.find((day) => day.iso === todayIso) || weekDates[0]).iso)
    }
  }, [weekDates, selectedDate])

  const { data: slots = [] } = useResourceAvailability(id, selectedDate)

  const { data: myPendingBookings = [] } = useMyBookings(
    { status: 'pending' },
    { enabled: isAuthenticated && role === 'cr_faculty' },
  )
  const hasPendingForDate = myPendingBookings.some(
    (b) => (b.resourceIds?.[0]?._id || b.resourceIds?.[0]) === id && toIsoDate(b.date) === selectedDate,
  )

  const events = useMemo(
    () =>
      slots.map((slot) => ({
        id: `${slot.start}-${slot.end}`,
        title:
          slot.status === 'occupied'
            ? 'Booked'
            : slot.status === 'non_vacant'
              ? slot.timetableEntry?.subject || 'Class'
              : 'Vacant',
        start: `${selectedDate}T${slot.start}:00`,
        end: `${selectedDate}T${slot.end}:00`,
        backgroundColor: STATUS_COLORS[slot.status],
        borderColor: STATUS_COLORS[slot.status],
        extendedProps: { slot },
      })),
    [slots, selectedDate],
  )

  if (isLoading) {
    return (
      <div className="resource-detail-page mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    )
  }

  if (isError || !resource) {
    return (
      <div className="resource-detail-page mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-gray-400 dark:text-gray-500">Resource not found.</p>
      </div>
    )
  }

  const typeMeta = TYPE_META[resource.type] || TYPE_META.classroom
  const TypeIcon = typeMeta.icon
  const galleryImages = resource.images?.length ? resource.images.slice(0, 3) : [null, null, null]
  const isPortalOpen = portalStatus === 'open'
  const isAllowedForDesignation = role !== 'cr_faculty' || canBook(designation, resource.type)

  const handleSlotClick = (info) => {
    const { slot } = info.event.extendedProps

    if (!isAuthenticated) {
      toast('Login to book this resource', { icon: '🔒' })
      navigate('/login')
      return
    }
    if (role !== 'cr_faculty') return
    if (!isPortalOpen) {
      toast.error('Portal is closed — bookings reopen Sunday 12 PM')
      return
    }
    if (!isAllowedForDesignation) {
      toast.error(`${designation}s can't book ${typeMeta.label.toLowerCase()}s`)
      return
    }
    if (hasPendingForDate && slot.status !== 'occupied') {
      toast('You already have a pending request for this resource on this date')
      return
    }

    setActiveBooking({ resource, date: selectedDate, slot })
  }

  return (
    <div className="resource-detail-page mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="back-button inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {galleryImages.map((src, index) => (
          <div
            key={index}
            className={`gallery-image flex items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 ${
              index === 0 ? 'h-64 sm:col-span-2 sm:row-span-2' : 'h-32'
            }`}
          >
            {src ? (
              <img src={src} alt={resource.name} className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="text-gray-300 dark:text-gray-600" size={28} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <TypeIcon size={12} />
              {typeMeta.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Users size={12} />
              Capacity {resource.capacity}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{resource.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {[resource.building, resource.floor && `Level ${resource.floor}`, resource.department]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <WishlistButton resourceId={resource._id} className="static bg-gray-50 dark:bg-gray-800" />
      </div>

      {resource.amenities?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {resource.amenities.map((amenity) => {
            const meta = AMENITY_META[amenity] || { label: amenity, icon: Plug }
            const Icon = meta.icon
            return (
              <span
                key={amenity}
                className="amenity-chip flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <Icon size={13} />
                {meta.label}
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <WeekDateTabs selectedDate={selectedDate} onSelect={setSelectedDate} />
      </div>

      <div className="calendar-wrap mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {selectedDate && (
          <FullCalendar
            key={`${resource._id}-${selectedDate}`}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            initialDate={selectedDate}
            headerToolbar={false}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            height="auto"
            events={events}
            eventClick={handleSlotClick}
            eventContent={(arg) => (
              <div className="fc-slot-content px-1 text-xs font-medium text-white">{arg.event.title}</div>
            )}
          />
        )}
      </div>

      <div className="legend mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.vacant }} />
          Vacant — click to book
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.non_vacant }} />
          Timetable — click to request
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.occupied }} />
          Booked — click to join waitlist
        </span>
      </div>

      <BookingModal
        resource={activeBooking?.resource}
        date={activeBooking?.date}
        slot={activeBooking?.slot}
        onClose={() => setActiveBooking(null)}
        onSuccess={() => setActiveBooking(null)}
      />
    </div>
  )
}

export default ResourceDetailPage
