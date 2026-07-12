import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import toast from 'react-hot-toast'
import { addDays } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { usePortalStatus } from '../../hooks/usePortalStatus'
import { usePortalStore } from '../../store/portalStore'
import { useMyBookings } from '../../hooks/useBookings'
import { useResources } from '../../hooks/useResources'
import { getAdminRequests } from '../../api/admin.api'
import { getResourceTimetableEntries } from '../../api/timetable.api'
import { getMondayOfWeek, toIsoDate, formatFriendlyDate } from '../../utils/dateUtils'
import Modal from '../../components/ui/Modal/Modal'
import Button from '../../components/ui/Button/Button'
import BookingStatusBadge from '../../components/booking/BookingStatusBadge/BookingStatusBadge'
import Skeleton from '../../components/ui/Skeleton/Skeleton'
import './CalendarPage.css'

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 }

const COLORS = {
  approved: '#10b981',
  pending: '#eab308',
  timetable: '#3b82f6',
  maintenance: '#a855f7',
}

const CalendarPage = () => {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const isAdmin = role === 'admin'
  const { status: portalStatus } = usePortalStatus()
  const setSelectedDateInStore = usePortalStore((state) => state.setSelectedDate)

  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek())
  const [selectedEvent, setSelectedEvent] = useState(null)

  const { data: bookings = [], isLoading: bookingsLoading } = useMyBookings({}, { enabled: !isAdmin })
  const { data: requestsRes, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin', 'requests', 'calendar'],
    queryFn: () => getAdminRequests({ status: 'all', limit: 200 }),
    select: (res) => res.data?.requests ?? [],
    enabled: isAdmin,
  })
  const requests = requestsRes ?? []

  const { data: resources = [] } = useResources({})
  const resourceById = useMemo(() => new Map(resources.map((r) => [r._id, r])), [resources])

  const bookingLike = isAdmin ? requests : bookings
  const weekEnd = addDays(weekStart, 4)
  const weekEvents = useMemo(
    () =>
      bookingLike.filter((b) => {
        if (!['pending', 'approved'].includes(b.status)) return false
        const iso = toIsoDate(b.date)
        return iso >= toIsoDate(weekStart) && iso <= toIsoDate(weekEnd)
      }),
    [bookingLike, weekStart, weekEnd],
  )

  const resourceIds = useMemo(
    () => [...new Set(weekEvents.map((b) => b.resourceIds?.[0]?._id || b.resourceIds?.[0]).filter(Boolean))],
    [weekEvents],
  )

  const { data: timetableByResource = {} } = useQuery({
    queryKey: ['calendar', 'timetable', resourceIds],
    queryFn: async () => {
      const entries = await Promise.all(
        resourceIds.map((id) => getResourceTimetableEntries(id).then((res) => [id, res.data?.entries ?? []])),
      )
      return Object.fromEntries(entries)
    },
    enabled: resourceIds.length > 0,
  })

  const events = useMemo(() => {
    const bookingEvents = weekEvents.map((b) => {
      const resource = resourceById.get(b.resourceIds?.[0]?._id || b.resourceIds?.[0])
      const isMaintenance = resource?.status === 'maintenance'
      const color = isMaintenance ? COLORS.maintenance : b.status === 'pending' ? COLORS.pending : COLORS.approved
      return {
        id: b._id,
        title: `${resource?.name || 'Resource'} — ${isAdmin ? b.userId?.name || 'Applicant' : b.formData?.eventName || 'Booking'}`,
        start: `${toIsoDate(b.date)}T${b.startTime}:00`,
        end: `${toIsoDate(b.date)}T${b.endTime}:00`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { type: 'booking', booking: b, resource },
      }
    })

    const timetableEvents = Object.entries(timetableByResource).flatMap(([resourceId, entries]) => {
      const resource = resourceById.get(resourceId)
      const isMaintenance = resource?.status === 'maintenance'
      return entries.flatMap((entry) => {
        const dayOffset = DAY_INDEX[entry.dayOfWeek]
        if (dayOffset === undefined) return []
        const date = toIsoDate(addDays(weekStart, dayOffset))
        return [
          {
            id: `${entry._id}-${date}`,
            title: `${resource?.name || 'Resource'} — ${entry.subject}`,
            start: `${date}T${entry.startTime}:00`,
            end: `${date}T${entry.endTime}:00`,
            backgroundColor: isMaintenance ? COLORS.maintenance : COLORS.timetable,
            borderColor: isMaintenance ? COLORS.maintenance : COLORS.timetable,
            extendedProps: { type: 'timetable', entry, resource },
          },
        ]
      })
    })

    return [...bookingEvents, ...timetableEvents]
  }, [weekEvents, timetableByResource, resourceById, isAdmin, weekStart])

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps)
  }

  const handleDateClick = (info) => {
    if (!isAdmin && role !== 'cr_faculty') return
    if (isAdmin) return // admins review requests, they don't book
    if (portalStatus !== 'open') {
      toast.error('Portal is closed — bookings reopen Sunday 12 PM')
      return
    }
    setSelectedDateInStore(toIsoDate(info.dateStr))
    toast('Pick a resource and time to book this slot', { icon: '📅' })
    navigate('/resources')
  }

  const isLoading = isAdmin ? requestsLoading : bookingsLoading

  return (
    <div className="calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((d) => addDays(d, -7))} aria-label="Previous week">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(getMondayOfWeek())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((d) => addDays(d, 7))} aria-label="Next week">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {formatFriendlyDate(weekStart)} – {formatFriendlyDate(weekEnd)}
      </p>

      {isLoading ? (
        <Skeleton className="mt-4 h-[600px] w-full" />
      ) : (
        <>
          {events.length === 0 && (
            <p className="empty-hint mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <CalendarDays size={16} />
              Nothing scheduled this week.
            </p>
          )}

          <div className="calendar-wrap mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <FullCalendar
              key={toIsoDate(weekStart)}
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate={weekStart}
              firstDay={1}
              hiddenDays={[0, 6]}
              headerToolbar={false}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="22:00:00"
              height="auto"
              events={events}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              eventContent={(arg) => (
                <div className="fc-slot-content truncate px-1 text-xs font-medium text-white">{arg.event.title}</div>
              )}
            />
          </div>
        </>
      )}

      <div className="legend mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.approved }} />
          Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.pending }} />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.timetable }} />
          Timetable Class
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.maintenance }} />
          Maintenance
        </span>
      </div>

      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.resource?.name || 'Details'}
      >
        {selectedEvent?.type === 'booking' && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Date &amp; Time</p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatFriendlyDate(selectedEvent.booking.date)} · {selectedEvent.booking.startTime} –{' '}
                {selectedEvent.booking.endTime}
              </p>
            </div>
            {isAdmin ? (
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Applicant</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {selectedEvent.booking.userId?.name} · {selectedEvent.booking.userId?.department}
                </p>
              </div>
            ) : (
              selectedEvent.booking.formData?.eventName && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Purpose</p>
                  <p className="text-gray-900 dark:text-gray-100">{selectedEvent.booking.formData.eventName}</p>
                </div>
              )
            )}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Status</p>
              <div className="mt-1">
                <BookingStatusBadge status={selectedEvent.booking.status} bookingType={selectedEvent.booking.bookingType} />
              </div>
            </div>
          </div>
        )}

        {selectedEvent?.type === 'timetable' && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Subject</p>
              <p className="text-gray-900 dark:text-gray-100">{selectedEvent.entry.subject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Class Section</p>
              <p className="text-gray-900 dark:text-gray-100">{selectedEvent.entry.classSection}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Faculty</p>
              <p className="text-gray-900 dark:text-gray-100">{selectedEvent.entry.facultyName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Time</p>
              <p className="text-gray-900 dark:text-gray-100">
                {selectedEvent.entry.dayOfWeek} · {selectedEvent.entry.startTime} – {selectedEvent.entry.endTime}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CalendarPage
