import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import Sidebar from '../Sidebar/Sidebar'
import Topbar from '../Topbar/Topbar'
import './AppLayout.css'

// Shell for every authenticated page — also the auth boundary itself: any
// route nested under this layout requires a logged-in user of any role,
// unless requireAuth is explicitly turned off (e.g. /resources, which must
// stay browsable by public visitors per the blueprint, but should still show
// the sidebar/topbar chrome for whoever is already logged in). Role-specific
// restriction (CR/Faculty vs admin) is layered on top by CRFacultyRoute/
// AdminRoute for the routes that need it.
const AppLayout = ({ requireAuth = true }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (requireAuth && !isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__body">
        {isAuthenticated && <Topbar />}
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
