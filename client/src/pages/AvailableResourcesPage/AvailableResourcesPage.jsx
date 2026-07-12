import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, History, LayoutGrid, List, SearchX, TrendingUp } from 'lucide-react'
import { usePortalStatus } from '../../hooks/usePortalStatus'
import { usePortalStore } from '../../store/portalStore'
import { useAuthStore } from '../../store/authStore'
import { useResources } from '../../hooks/useResources'
import { useMyBookings } from '../../hooks/useBookings'
import { getTrendingResources } from '../../api/resource.api'
import { getWeekdayDates, toIsoDate } from '../../utils/dateUtils'
import WeekDateTabs from '../../components/portal/WeekDateTabs/WeekDateTabs'
import ResourceFilters from '../../components/resources/ResourceFilters/ResourceFilters'
import ResourceCard from '../../components/resources/ResourceCard/ResourceCard'
import BookingModal from '../../components/booking/BookingModal/BookingModal'
import Skeleton from '../../components/ui/Skeleton/Skeleton'
import './AvailableResourcesPage.css'

const HISTORY_STORAGE_KEY = 'campusbook-resource-history'
const TABS = [
  { key: 'browse', label: 'Browse' },
  { key: 'trending', label: 'Trending' },
  { key: 'history', label: 'History' },
]

// Hourly options 08:00-21:00 for the start/end time pickers.
const TIME_OPTIONS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

const initialFilters = { types: [], building: '', department: '', minCapacity: 1, amenities: [] }

const AvailableResourcesPage = () => {
  const [searchParams] = useSearchParams()
  usePortalStatus() // hydrates portalStore for this (public) page — status/currentWeek read from it below
  const currentWeek = usePortalStore((state) => state.currentWeek)
  const setSelectedDateInStore = usePortalStore((state) => state.setSelectedDate)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  const [activeTab, setActiveTab] = useState('browse')
  const [viewMode, setViewMode] = useState('grid')
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    types: searchParams.get('type') ? [searchParams.get('type')] : [],
  }))
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [activeBooking, setActiveBooking] = useState(null) // { resource, date, slot }

  const weekDates = useMemo(() => getWeekdayDates(currentWeek?.weekStartDate), [currentWeek])

  useEffect(() => {
    if (!selectedDate && weekDates.length > 0) {
      const todayIso = toIsoDate(new Date())
      const match = weekDates.find((day) => day.iso === todayIso) || weekDates[0]
      setSelectedDate(match.iso)
    }
  }, [weekDates, selectedDate])

  useEffect(() => {
    setSelectedDateInStore(selectedDate)
  }, [selectedDate, setSelectedDateInStore])

  const resourceFilters = useMemo(
    () => ({
      department: filters.department || undefined,
      building: filters.building || undefined,
      capacity: filters.minCapacity > 1 ? filters.minCapacity : undefined,
      amenities: filters.amenities.length ? filters.amenities.join(',') : undefined,
    }),
    [filters],
  )

  const {
    data: allResources = [],
    isLoading: resourcesLoading,
    isError: resourcesError,
  } = useResources(resourceFilters)

  // Unfiltered, independent of resourceFilters above, so the Building/
  // Department dropdown options never shrink just because some other filter
  // is currently narrowing the displayed list.
  const { data: everyResource = [] } = useResources({})

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ['resources', 'trending'],
    queryFn: () => getTrendingResources({ limit: 6 }),
    select: (res) => res.data?.trending ?? [],
    enabled: activeTab === 'trending',
  })

  const { data: myPendingBookings = [] } = useMyBookings(
    { status: 'pending' },
    { enabled: isAuthenticated && role === 'cr_faculty' },
  )
  const pendingResourceDates = useMemo(
    () => new Set(myPendingBookings.map((b) => `${b.resourceIds?.[0]?._id || b.resourceIds?.[0]}:${toIsoDate(b.date)}`)),
    [myPendingBookings],
  )

  const [historyIds, setHistoryIds] = useState(
    () => JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]'),
  )
  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryIds(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]'))
    }
  }, [activeTab])

  // Client-side type/type-badge filtering (department/capacity/amenities
  // already applied server-side via resourceFilters above).
  const filteredResources = useMemo(
    () => allResources.filter((resource) => filters.types.length === 0 || filters.types.includes(resource.type)),
    [allResources, filters.types],
  )

  const trendingResources = useMemo(() => trending.map((entry) => entry.resource).filter(Boolean), [trending])
  const historyResources = useMemo(
    () => historyIds.map((id) => allResources.find((r) => r._id === id)).filter(Boolean),
    [historyIds, allResources],
  )

  const visibleResources =
    activeTab === 'trending' ? trendingResources : activeTab === 'history' ? historyResources : filteredResources
  const isLoading = activeTab === 'trending' ? trendingLoading : resourcesLoading

  const buildings = useMemo(
    () => [...new Set(everyResource.map((r) => r.building).filter(Boolean))].sort(),
    [everyResource],
  )
  const departments = useMemo(
    () => [...new Set(everyResource.map((r) => r.department).filter(Boolean))].sort(),
    [everyResource],
  )

  const handleResourceAction = (resource, date, slot) => {
    const isPending = pendingResourceDates.has(`${resource._id}:${date}`)
    if (isPending) return
    setActiveBooking({ resource, date, slot })
  }

  return (
    <div className="available-resources-page bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="breadcrumb mb-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-700 dark:text-gray-200">Resources</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Available Resources</h1>

        <div className="tabs-row mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {TABS.map(({ key, label }) => {
            const Icon = key === 'trending' ? TrendingUp : key === 'history' ? History : null
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`resource-tab flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
                  activeTab === key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {Icon && <Icon size={14} />}
                {label}
              </button>
            )
          })}
        </div>

        {activeTab === 'browse' && (
          <div className="mt-4">
            <WeekDateTabs selectedDate={selectedDate} onSelect={setSelectedDate} />

            <div className="time-range-picker mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="start-time"
                  className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Start Time
                </label>
                <select
                  id="start-time"
                  value={startTime}
                  onChange={(event) => {
                    const value = event.target.value
                    setStartTime(value)
                    if (endTime && endTime <= value) setEndTime('')
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Select…</option>
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="end-time" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  End Time
                </label>
                <select
                  id="end-time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Select…</option>
                  {TIME_OPTIONS.filter((time) => !startTime || time > startTime).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          {activeTab === 'browse' && (
            <div className="lg:col-span-1">
              <ResourceFilters
                filters={filters}
                onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                buildings={buildings}
                departments={departments}
              />
            </div>
          )}

          <div className={activeTab === 'browse' ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoading ? 'Loading…' : `${visibleResources.length} resource${visibleResources.length === 1 ? '' : 's'}`}
              </p>
              <div className="view-toggle flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`rounded-md p-1.5 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`rounded-md p-1.5 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-56 w-full" />
                ))}
              </div>
            ) : resourcesError ? (
              <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                Couldn&apos;t load resources.
              </p>
            ) : visibleResources.length === 0 ? (
              <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
                <SearchX size={32} />
                <p className="text-sm">No resources match your filters.</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {visibleResources.map((resource) => (
                  <ResourceCard
                    key={resource._id}
                    resource={resource}
                    date={activeTab === 'browse' ? selectedDate : ''}
                    startTime={activeTab === 'browse' ? startTime : ''}
                    endTime={activeTab === 'browse' ? endTime : ''}
                    viewMode={viewMode}
                    isPendingForUser={pendingResourceDates.has(`${resource._id}:${selectedDate}`)}
                    onAction={handleResourceAction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
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

export default AvailableResourcesPage
