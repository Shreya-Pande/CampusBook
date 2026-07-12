import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  ClipboardList,
  FolderCog,
  LayoutGrid,
  LifeBuoy,
  Plus,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import './Sidebar.css'

const CR_FACULTY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/resources', label: 'Resources', icon: BookOpen },
  { to: '/bookings', label: 'My Bookings', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/resources', label: 'Resources', icon: BookOpen },
  { to: '/admin/requests', label: 'Booking Requests', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

const SUPER_ADMIN_NAV = [
  { to: '/admin/resources', label: 'Manage Resources', icon: FolderCog },
  { to: '/admin/timetable', label: 'Manage Timetable', icon: Clock },
  { to: '/admin/routing', label: 'Approval Routing', icon: Shield },
  { to: '/admin/users', label: 'Manage Users', icon: Users },
]

const navLinkClass = ({ isActive }) =>
  `sidebar-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
  }`

const NavItem = ({ to, label, icon: Icon }) => (
  <NavLink to={to} className={navLinkClass}>
    <Icon size={18} />
    <span className="sidebar-link-label">{label}</span>
  </NavLink>
)

const Sidebar = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const adminType = useAuthStore((state) => state.adminType)

  // AppLayout already gates on isAuthenticated before mounting this component,
  // but guard again here too — the sidebar itself should never render for a
  // logged-out visitor per the blueprint's public-vs-authenticated split.
  if (!isAuthenticated) return null

  const isAdmin = role === 'admin'
  const navItems = isAdmin ? ADMIN_NAV : CR_FACULTY_NAV

  return (
    <aside className="sidebar flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">C</span>
          CampusBook
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Smart campus booking</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {isAdmin && adminType === 'super_admin' && (
          <>
            <p className="sidebar-section-label px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Super Admin
            </p>
            {SUPER_ADMIN_NAV.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {!isAdmin && (
        <div className="px-3 pb-3">
          <NavLink
            to="/resources"
            className="new-booking-btn flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={16} />
            <span className="sidebar-link-label">New Booking</span>
          </NavLink>
        </div>
      )}

      <div className="space-y-1 border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <NavItem to="/profile" label="Settings" icon={Settings} />
        <a
          href="mailto:support@campusbook.edu"
          className="sidebar-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <LifeBuoy size={18} />
          <span className="sidebar-link-label">Support</span>
        </a>
      </div>
    </aside>
  )
}

export default Sidebar
