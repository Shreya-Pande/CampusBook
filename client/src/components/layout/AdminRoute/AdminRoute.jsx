import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import './AdminRoute.css'

const AdminRoute = () => {
  const role = useAuthStore((state) => state.role)

  if (role !== 'admin') return <Navigate to="/login" replace />
  return <Outlet />
}

export default AdminRoute
