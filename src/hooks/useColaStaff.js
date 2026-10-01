import { useCallback, useEffect, useRef, useState } from 'react'
import staffApi from '../api/staffAxios'
import { useStaffBadges } from '../context/StaffBadgesContext'

// Fetch de UNA sola cola logistica. Reemplaza al Promise.all de 4 requests que
// hacia StaffPedidos al montar: cada pagina pide solo lo que va a mostrar.
//
// `recargar()` re-pide esta cola (al abrir la pagina).
// `recargarTodo()` ademas refresca los badges del nav — usalo DESPUES de cada
// accion (aprobar, enviar, entregar, retirar, reintentar, cancelar) para que el
// numero de otra pagina no quede mintiendo.
//
// Opciones:
//   params  → query params de la peticion
//   extraer → (data) => array, para los endpoints que devuelven un sobre
//              ({ ordenes: [...] }) en vez de un array plano.
export function useColaStaff(url, { params, extraer } = {}) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const { refrescar } = useStaffBadges()

  // Los params se identidad-serializan para no disparar el efecto en cada render
  // por un objeto nuevo. El extractor NO se serializa (puede ser una closure):
  // se guarda en un ref y se publica DENTRO del efecto, porque escribir un ref
  // durante el render lo marca react-hooks/refs.
  const paramsKey = JSON.stringify(params || null)
  const extraerRef = useRef(extraer)
  const extraerActual = extraer

  const recargar = useCallback(async () => {
    setError('')
    try {
      const config = paramsKey ? { params: JSON.parse(paramsKey) } : undefined
      const { data } = await staffApi.get(url, config)
      setDatos(extraerRef.current ? extraerRef.current(data) : (data || []))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la cola')
    } finally {
      setCargando(false)
    }
  }, [url, paramsKey])

  const recargarTodo = useCallback(async () => {
    await Promise.all([recargar(), refrescar()])
  }, [recargar, refrescar])

  useEffect(() => {
    // El `extraer` vigente se publica aca (no en el render) para que el fetch
    // de esta pasada use el de ahora.
    extraerRef.current = extraerActual
    // Cadena .then() y NO async/await: ver la seccion "Lint" del AGENTS del
    // frontend — react-hooks/set-state-in-effect marca cualquier async con
    // setState aunque el setState vaya despues del await.
    // NO se hace `setCargando(true)` al abrir el efecto: el estado inicial ya
    // es `true` y un setState sincrono dentro del efecto lo prohibe la misma
    // regla (react-hooks/set-state-in-effect). Para el refetch manual esta
    // Pagina se usa `recargar()`, que ya limpia su propio error.
    const config = paramsKey ? { params: JSON.parse(paramsKey) } : undefined
    staffApi.get(url, config)
      .then(({ data }) => {
        setDatos(extraerRef.current ? extraerRef.current(data) : (data || []))
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'No se pudo cargar la cola')
      })
      .finally(() => {
        setCargando(false)
      })
  }, [url, paramsKey, extraerActual])

  return { datos, cargando, error, recargar, recargarTodo }
}
