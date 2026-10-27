import { useState, useEffect, useCallback } from 'react'

// Reloj de baja frecuencia para la página (no para el contador del hero, que
// tiene el suyo). Se actualiza cada `intervaloMs` y al volver a la pestaña,
// porque los navegadores frenan los timers en segundo plano.
// Devuelve [ahora, refrescar].
export default function useAhora(intervaloMs = 30000) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs)
    const alVolver = () => {
      if (document.visibilityState === 'visible') setAhora(Date.now())
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [intervaloMs])

  const refrescar = useCallback(() => setAhora(Date.now()), [])
  return [ahora, refrescar]
}
