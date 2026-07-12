import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import './PublicRoute.css'

// Guards auth-only pages (login/register) — a logged-in user has no reason
// to see them again, so send them straight to their dashboard.
const PublicRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default PublicRoute
