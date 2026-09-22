import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ---------------------------------------------------------------
// Igual que <PrivateRoute>, pero para rutas de información sensible
// (Pagos, Estado de Cuenta): además de que el JWT no haya vencido por
// fecha, revalida en caliente contra el backend (GET /auth/verify)
// que la sesión sigue siendo válida AHORA — cubre los casos en que
// alguien fue desactivado o se le revocó el token_version a mitad de
// sesión, sin esperar a que el JWT de 3 días expire por sí solo.
//
// Si la revalidación falla, manda a /login (no a /home): es una
// acción sensible, así que pedimos que se vuelva a autenticar en vez
// de solo devolverlo a la tienda con la sesión larga todavía viva.
// ---------------------------------------------------------------
function PrivateRouteSensible({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const [verificando, setVerificando] = useState(true)
  const [valido, setValido] = useState(false)

  useEffect(() => {
    if (loading || !user) return

    let cancelado = false
    api.get('/auth/verify')
      .then(() => { if (!cancelado) setValido(true) })
      .catch(() => { if (!cancelado) setValido(false) })
      .finally(() => { if (!cancelado) setVerificando(false) })

    return () => { cancelado = true }
  }, [loading, user])

  if (loading) {
    return <p>Verificando sesión...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (verificando) {
    return <p>Verificando sesión...</p>
  }

  if (adminOnly && !user.es_admin) {
    return <Navigate to="/" replace />
  }

  if (!valido) {
    return <Navigate to="/login?expirado=1" replace />
  }

  return children
}

export default PrivateRouteSensible