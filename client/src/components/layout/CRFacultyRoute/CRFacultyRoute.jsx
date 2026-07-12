import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import './CRFacultyRoute.css'

const CRFacultyRoute = () => {
  const role = useAuthStore((state) => state.role)

  if (role !== 'cr_faculty') return <Navigate to="/login" replace />
  return <Outlet />
}

export default CRFacultyRoute
