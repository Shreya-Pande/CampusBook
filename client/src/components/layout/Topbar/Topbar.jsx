import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { useDarkMode } from '../../../hooks/useDarkMode'
import './Topbar.css'

// Unread count is a static placeholder until the notification API/store lands
// (Phase 10c) — the badge markup and styling are ready for real data then.
const UNREAD_NOTIFICATIONS = 0

const Topbar = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const department = useAuthStore((state) => state.department)
  const logout = useAuthStore((state) => state.logout)
  const { isDark, toggle: toggleDarkMode } = useDarkMode()

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="topbar flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="topbar-search relative flex-1 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Search resources, bookings…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:bg-gray-900"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="theme-toggle rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="notification-bell relative rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Bell size={18} />
          {UNREAD_NOTIFICATIONS > 0 && (
            <span className="notification-badge absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {UNREAD_NOTIFICATIONS > 9 ? '9+' : UNREAD_NOTIFICATIONS}
            </span>
          )}
        </button>

        <div className="topbar-user flex items-center gap-2 rounded-lg py-1 pr-1 pl-2">
          <span className="user-avatar flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
            {initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{department || '—'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

export default Topbar
