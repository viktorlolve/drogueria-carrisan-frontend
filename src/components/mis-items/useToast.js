import { useCallback, useEffect, useRef, useState } from 'react'

const DURACION_BASE = 4200
const DURACION_CON_ACCION = 7000

// Toast único (un solo aviso a la vez).
//   mostrar(mensaje)                     → tipo 'exito'
//   mostrar(mensaje, { tipo: 'error' })  → tipo 'error'
//   mostrar(mensaje, { accion: { label, onClick } }) → botón que ejecuta la
//     acción, cierra el aviso y mantiene el toast visible más tiempo.
export default function useToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const limpiar = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => limpiar(), [limpiar])

  const cerrar = useCallback(() => {
    limpiar()
    setToast(null)
  }, [limpiar])

  const mostrar = useCallback((mensaje, opciones = {}) => {
    const id = Date.now()
    setToast({
      id,
      mensaje,
      tipo: opciones.tipo === 'error' ? 'error' : 'exito',
      accion: opciones.accion || null,
    })
    limpiar()
    timerRef.current = setTimeout(() => {
      setToast((actual) => (actual && actual.id === id ? null : actual))
    }, opciones.accion ? DURACION_CON_ACCION : DURACION_BASE)
  }, [limpiar])

  return { toast, mostrar, cerrar }
}