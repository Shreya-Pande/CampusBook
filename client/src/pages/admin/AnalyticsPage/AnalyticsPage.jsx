import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getAnalyticsOverview,
  getUtilization,
  getPeakHours,
  getDepartmentBreakdown,
  getPortalRush,
  getHodResponseTime,
} from '../../../api/admin.api'
import Skeleton from '../../../components/ui/Skeleton/Skeleton'
import './AnalyticsPage.css'

const PERIOD_TABS = [
  { key: 'week', label: 'This Week' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
]

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const INDIGO = '#6366f1'
const INDIGO_SHADES = ['#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']
const AXIS_COLOR = '#9ca3af'

const STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  expired: 'Expired',
}

const KpiTile = ({ label, value, isLoading }) => (
  <div className="kpi-tile rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    {isLoading ? (
      <Skeleton className="mt-2 h-8 w-16" />
    ) : (
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    )}
  </div>
)

const ChartCard = ({ title, isLoading, isEmpty, children }) => (
  <div className="chart-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    {isLoading ? (
      <Skeleton className="mt-4 h-64 w-full" />
    ) : isEmpty ? (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-gray-400 dark:text-gray-500">
        <BarChart3 size={28} />
        <p className="text-sm">No data yet for this period.</p>
      </div>
    ) : (
      <div className="mt-4 h-64">{children}</div>
    )}
  </div>
)

const AnalyticsPage = () => {
  const [period, setPeriod] = useState('30d')

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'overview', period],
    queryFn: () => getAnalyticsOverview({ period }),
    select: (res) => res.data,
  })

  // Utilization is intentionally not period-scoped — the backend computes it
  // over a fixed trailing 30-day window regardless of the KPI period tab.
  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'utilization'],
    queryFn: getUtilization,
    select: (res) => res.data,
  })

  const { data: peakHoursData, isLoading: peakHoursLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'peak-times', period],
    queryFn: () => getPeakHours({ period }),
    select: (res) => res.data,
  })

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'departments', period],
    queryFn: () => getDepartmentBreakdown({ period }),
    select: (res) => res.data,
  })

  const { data: portalRushData, isLoading: portalRushLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'portal-rush'],
    queryFn: getPortalRush,
    select: (res) => res.data,
  })

  const { data: hodResponseData, isLoading: hodResponseLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'hod-response-time'],
    queryFn: getHodResponseTime,
    select: (res) => res.data,
  })

  const utilization = useMemo(() => utilizationData?.utilization ?? [], [utilizationData])
  const avgUtilization = utilization.length
    ? Math.round(utilization.reduce((sum, r) => sum + r.utilizationRate, 0) / utilization.length)
    : 0

  const hodResults = hodResponseData?.results ?? []
  const avgHodResponse = hodResults.length
    ? (hodResults.reduce((sum, r) => sum + r.avgResponseHours, 0) / hodResults.length).toFixed(1)
    : null

  const heatmap = useMemo(() => peakHoursData?.heatmap ?? [], [peakHoursData])

  const bookingTrends = useMemo(() => {
    const byDay = Object.fromEntries(DAY_ORDER.map((day) => [day, 0]))
    heatmap.forEach((row) => {
      if (byDay[row.dayOfWeek] !== undefined) byDay[row.dayOfWeek] += row.count
    })
    return DAY_ORDER.map((day) => ({ day: day.slice(0, 3), bookings: byDay[day] }))
  }, [heatmap])

  const peakHoursByHour = useMemo(() => {
    const byHour = {}
    heatmap.forEach((row) => {
      byHour[row.hour] = (byHour[row.hour] || 0) + row.count
    })
    return Object.entries(byHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }))
  }, [heatmap])

  const departments = departmentsData?.departments ?? []

  const mostRequested = useMemo(
    () =>
      [...utilization]
        .sort((a, b) => b.totalBookings - a.totalBookings)
        .slice(0, 8)
        .map((r) => ({ name: r.resourceName, bookings: r.totalBookings })),
    [utilization],
  )

  const statusBreakdown = useMemo(() => {
    const byStatus = overview?.byStatus || {}
    return Object.entries(byStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count }))
  }, [overview])

  const portalRush = useMemo(
    () =>
      [...(portalRushData?.rush ?? [])].reverse().map((week) => ({
        week: format(new Date(week.weekStartDate), 'MMM d'),
        firstThirtyMin: week.stats?.bookingsInFirst30Min ?? 0,
      })),
    [portalRushData],
  )

  return (
    <div className="analytics-page">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>

      <div className="tabs-row mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPeriod(tab.key)}
            className={`period-tab border-b-2 px-4 py-2 text-sm font-medium ${
              period === tab.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Total Bookings" value={overview?.totalBookings ?? 0} isLoading={overviewLoading} />
        <KpiTile label="Utilization %" value={`${avgUtilization}%`} isLoading={utilizationLoading} />
        <KpiTile label="Approval Rate" value={`${overview?.approvalRate ?? 0}%`} isLoading={overviewLoading} />
        <KpiTile label="Cancel Rate" value={`${overview?.cancellationRate ?? 0}%`} isLoading={overviewLoading} />
        <KpiTile
          label="Avg HOD Response"
          value={avgHodResponse != null ? `${avgHodResponse}h` : '—'}
          isLoading={hodResponseLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Booking Trends" isLoading={peakHoursLoading} isEmpty={heatmap.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <LineChart data={bookingTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} opacity={0.2} />
              <XAxis dataKey="day" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke={INDIGO} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department-wise Usage" isLoading={departmentsLoading} isEmpty={departments.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <BarChart data={departments}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} opacity={0.2} />
              <XAxis dataKey="department" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="totalBookings" fill={INDIGO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Hours" isLoading={peakHoursLoading} isEmpty={peakHoursByHour.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <BarChart data={peakHoursByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} opacity={0.2} />
              <XAxis dataKey="hour" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={INDIGO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most Requested Resources" isLoading={utilizationLoading} isEmpty={mostRequested.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <BarChart data={mostRequested} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} opacity={0.2} />
              <XAxis type="number" stroke={AXIS_COLOR} fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke={AXIS_COLOR} fontSize={11} width={110} />
              <Tooltip />
              <Bar dataKey="bookings" fill={INDIGO} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Approval Rate" isLoading={overviewLoading} isEmpty={statusBreakdown.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {statusBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={INDIGO_SHADES[index % INDIGO_SHADES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Portal Rush Analysis" isLoading={portalRushLoading} isEmpty={portalRush.length === 0}>
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 260 }}>
            <BarChart data={portalRush}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} opacity={0.2} />
              <XAxis dataKey="week" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="firstThirtyMin" name="Bookings in first 30 min" fill={INDIGO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default AnalyticsPage
