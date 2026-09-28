import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStaffAuth } from '../context/StaffAuthContext'
import Landing from '../pages/Landing'

function RootRedirect() {
  const { user, loading } = useAuth()
  const { staff } = useStaffAuth()

  if (loading) return <p>Cargando...</p>
  // Sesion staff sin sesion de cliente: al abrir la app instalada, el personal
  // de la empresa va directo a su panel y no a la landing de la tienda.
  if (staff && !user) return <Navigate to="/staff/dashboard" replace />
  if (user) return <Navigate to="/home" replace />
  return <Landing />
}

export default RootRedirect
