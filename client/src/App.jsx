import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import PublicRoute from './components/layout/PublicRoute/PublicRoute'
import AppLayout from './components/layout/AppLayout/AppLayout'
import CRFacultyRoute from './components/layout/CRFacultyRoute/CRFacultyRoute'
import AdminRoute from './components/layout/AdminRoute/AdminRoute'

import LandingPage from './pages/LandingPage/LandingPage'
import AvailableResourcesPage from './pages/AvailableResourcesPage/AvailableResourcesPage'
import ResourceDetailPage from './pages/ResourceDetailPage/ResourceDetailPage'
import LoginPage from './pages/auth/LoginPage/LoginPage'
import RegisterPage from './pages/auth/RegisterPage/RegisterPage'
import DashboardPage from './pages/DashboardPage/DashboardPage'
import CalendarPage from './pages/CalendarPage/CalendarPage'
import NotificationsPage from './pages/NotificationsPage/NotificationsPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import MyBookingsPage from './pages/cr/MyBookingsPage/MyBookingsPage'
import MyWaitlistPage from './pages/cr/MyWaitlistPage/MyWaitlistPage'
import BookingRequestsPage from './pages/admin/BookingRequestsPage/BookingRequestsPage'
import ApprovalRoutingPage from './pages/admin/ApprovalRoutingPage/ApprovalRoutingPage'
import ManageResourcesPage from './pages/admin/ManageResourcesPage/ManageResourcesPage'
import ManageTimetablePage from './pages/admin/ManageTimetablePage/ManageTimetablePage'
import ManageUsersPage from './pages/admin/ManageUsersPage/ManageUsersPage'
import AnalyticsPage from './pages/admin/AnalyticsPage/AnalyticsPage'

function App() {
  return (
    <Routes>
      {/* Public — browsable by everyone, no login required */}
      <Route path="/" element={<LandingPage />} />

      {/* Public-only — already-authenticated users get bounced to /dashboard */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Public but chrome-aware — browsable without login, shows the
          sidebar/topbar shell for whoever is already authenticated */}
      <Route element={<AppLayout requireAuth={false} />}>
        <Route path="/resources" element={<AvailableResourcesPage />} />
      </Route>

      {/* Authenticated shell — any logged-in role */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/resources/:id" element={<ResourceDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* Shared with /admin/analytics for now — same stub page, role-aware
            content split lands once AnalyticsPage is built out in 10c. */}
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* CR / TnP / Faculty only */}
        <Route element={<CRFacultyRoute />}>
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/waitlist" element={<MyWaitlistPage />} />
        </Route>

        {/* Admin only */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/requests" element={<BookingRequestsPage />} />
          <Route path="/admin/routing" element={<ApprovalRoutingPage />} />
          <Route path="/admin/resources" element={<ManageResourcesPage />} />
          <Route path="/admin/timetable" element={<ManageTimetablePage />} />
          <Route path="/admin/users" element={<ManageUsersPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
