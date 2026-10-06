import { useState } from 'react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes, { etiquetaEnvio } from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'

const RANGOS = [
  { id: '7', texto: 'Últimos 7 días', dias: 7 },
  { id: '30', texto: 'Últimos 30 días', dias: 30 },
  { id: '90', texto: 'Últimos 90 días', dias: 90 },
]

// la fecha de corte es un estado (inicializado con lazy init y recalculado en
// el handler del selector): Date.now() en render (aunque fuera dentro de un
// useMemo) lo marca react-hooks/purity. Patron identico a StaffReportesFinancieros.
function fechaDesdeISO(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString()
}

// getCompletadas devuelve { ordenes: [...] }, no un array plano. El extractor
// es funcion de MODULO (no closure inline) para que su referencia sea estable
// entre renders: useColaStaff lo declara como dependencia del efecto y una
// arrow inline nueva por render dispararia el fetch en bucle.
const extraerOrdenes = (data) => data?.ordenes || []

// Historial de ordenes entregadas y retiradas. Sin badge en el nav a proposito:
// es consulta, no trabajo pendiente.
export default function StaffPedidosCompletadas() {
  const [rango, setRango] = useState('30')
  const [desde, setDesde] = useState(() => fechaDesdeISO(30))
  const dias = RANGOS.find((r) => r.id === rango)?.dias || 30
  const { datos, cargando, error } = useColaStaff('/staff/logistica/completadas', {
    params: { desde },
    extraer: extraerOrdenes,
  })

  function cambiarRango(e) {
    const id = e.target.value
    setRango(id)
    setDesde(fechaDesdeISO(RANGOS.find((r) => r.id === id)?.dias || 30))
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="completadas" titulo="Órdenes Completadas">
      <div className="sp-header">
        <p className="sp-meta">Órdenes entregadas y retiradas. Solo consulta.</p>
        <select className="sp-select--rango" value={rango} onChange={cambiarRango} aria-label="Período">
          {RANGOS.map((r) => (
            <option key={r.id} value={r.id}>{r.texto}</option>
          ))}
        </select>
      </div>
      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        vacio={`Sin completadas en los últimos ${dias} días.`}
        badge={(orden) => <span className="sp-badge sp-badge--entregado">{etiquetaEnvio(orden)}</span>}
      />
    </LayoutDepartamento>
  )
}