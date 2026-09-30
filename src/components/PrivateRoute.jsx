import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p>Cargando...</p>
  }

  if (!user) {
    // Se guarda el destino (ruta + query) para que Login.jsx devuelva al usuario
    // ahí después de autenticarse, en vez de mandarlo siempre a '/'.
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (adminOnly && !user.es_admin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default PrivateRoute