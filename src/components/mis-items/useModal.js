import { useEffect, useRef } from 'react'

// Mientras el modal/hoja está montado: bloquea el scroll del body y cierra
// con Escape. `onCerrarRef` hace que el listener de teclado siempre llame al
// último callback sin remontar el efecto en cada render.
export default function useModal(onCerrar) {
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  })

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function alPulsarTecla(e) {
      if (e.key === 'Escape') onCerrarRef.current()
    }

    window.addEventListener('keydown', alPulsarTecla)
    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', alPulsarTecla)
    }
  }, [])
}