import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileDown,
  ListChecks,
  Plus,
  UsersRound,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMyBookings } from '../../hooks/useBookings'
import { useMyWaitlist } from '../../hooks/useWaitlist'
import { getAdminRequests, getAnalyticsOverview } from '../../api/admin.api'
import PortalStatusBanner from '../../components/portal/PortalStatusBanner/PortalStatusBanner'
import KPICard from '../../components/dashboard/KPICard/KPICard'
import ActivityFeed from '../../components/dashboard/ActivityFeed/ActivityFeed'
import NotificationsPanel from '../../components/dashboard/NotificationsPanel/NotificationsPanel'
import MiniCalendar from '../../components/dashboard/MiniCalendar/MiniCalendar'
import TodaySchedule from '../../components/dashboard/TodaySchedule/TodaySchedule'
import EliteBookerCard from '../../components/dashboard/EliteBookerCard/EliteBookerCard'
import './DashboardPage.css'

const isToday = (date) => new Date(date).toDateString() === new Date().toDateString()

const downloadKpiReport = (rows) => {
  const csv = ['Metric,Value', ...rows.map(({ label, value }) => `"${label}",${value}`)].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `campusbook-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// CR / TnP / Faculty: Upcoming Bookings, Pending Requests, Today's Bookings, Waitlist Entries
const useCRKpis = (enabled) => {
  const { data: bookings = [], isLoading: bookingsLoading } = useMyBookings({}, { enabled })
  const { data: pending = [], isLoading: pendingLoading } = useMyBookings({ status: 'pending' }, { enabled })
  const { data: waitlist = [], isLoading: waitlistLoading } = useMyWaitlist({ enabled })

  const upcoming = bookings.filter((b) => b.status === 'approved' && new Date(b.date) >= new Date(new Date().toDateString()))
  const today = bookings.filter((b) => b.status === 'approved' && isToday(b.date))

  return [
    {
      label: 'Upcoming Bookings',
      value: upcoming.length,
      subtitle: 'This week',
      icon: CalendarCheck2,
      color: 'indigo',
      isLoading: bookingsLoading,
    },
    {
      label: 'Pending Requests',
      value: pending.length,
      subtitle: 'Awaiting approval',
      icon: Clock,
      color: 'amber',
      isLoading: pendingLoading,
    },
    {
      label: "Today's Bookings",
      value: today.length,
      subtitle: new Date().toLocaleDateString(undefined, { weekday: 'long' }),
      icon: CheckCircle2,
      color: 'emerald',
      isLoading: bookingsLoading,
    },
    {
      label: 'Waitlist Entries',
      value: waitlist.length,
      subtitle: 'Active holds',
      icon: ListChecks,
      color: 'rose',
      isLoading: waitlistLoading,
    },
  ]
}

// Admin (HOD/dept admin/super admin): Total Resources, Pending Approvals, Today's Bookings, Users Online
const useAdminKpis = (enabled) => {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => getAnalyticsOverview(),
    select: (res) => res.data,
    enabled,
  })
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin', 'requests', 'kpi-count'],
    queryFn: () => getAdminRequests({ limit: 1 }),
    select: (res) => res.data,
    enabled,
  })

  return [
    {
      label: 'Total Resources',
      value: overview?.totalResources ?? 0,
      subtitle: 'Across campus',
      icon: Building2,
      color: 'indigo',
      isLoading: overviewLoading,
    },
    {
      label: 'Pending Approvals',
      value: requests?.total ?? 0,
      subtitle: 'Need your review',
      icon: Clock,
      color: 'amber',
      isLoading: requestsLoading,
    },
    {
      label: "Today's Bookings",
      value: overview?.todayBookings ?? 0,
      subtitle: new Date().toLocaleDateString(undefined, { weekday: 'long' }),
      icon: CheckCircle2,
      color: 'emerald',
      isLoading: overviewLoading,
    },
    {
      label: 'Users Online',
      value: overview?.totalUsers ?? 0,
      subtitle: overview?.totalUsers == null ? 'Super admin only' : 'Registered CR/Faculty',
      icon: UsersRound,
      color: 'rose',
      isLoading: overviewLoading,
    },
  ]
}

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAdmin = role === 'admin'

  // Hooks can't be called conditionally, so both run on every render — but
  // `enabled` keeps the non-matching role's queries from ever firing a
  // request (avoiding needless 403s against the admin-only endpoints).
  const crKpis = useCRKpis(!isAdmin)
  const adminKpis = useAdminKpis(isAdmin)
  const kpis = isAdmin ? adminKpis : crKpis

  const handleExport = () => downloadKpiReport(kpis.map(({ label, value }) => ({ label, value })))

  return (
    <div className="dashboard-page">
      <PortalStatusBanner />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {user?.name || 'there'}.</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Here&apos;s what&apos;s happening today.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="export-report-btn inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <FileDown size={16} />
            Export Report
          </button>
          {!isAdmin && (
            <Link
              to="/resources"
              className="quick-book-btn inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Quick Book
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActivityFeed />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/resources"
              className="quick-access-card flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <BarChart3 size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Browse Resources</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Find your next room</p>
              </div>
            </Link>

            <Link
              to="/calendar"
              className="quick-access-card flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <CalendarDays size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Open Calendar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">See the full campus week</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <NotificationsPanel />
          <MiniCalendar />
          <TodaySchedule />
          <EliteBookerCard />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
