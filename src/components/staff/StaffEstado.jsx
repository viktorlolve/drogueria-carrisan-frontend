import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import '../../styles/staff-tokens.css'
import './StaffEstado.css'

// Estados estándar de las listas del staff: cargando (skeleton), error con
// "Reintentar" y vacío con acción opcional.
//
//   <StaffEstado tipo="cargando" filas={4} />
//   <StaffEstado tipo="error" mensaje={error} onReintentar={recargar} />
//   <StaffEstado tipo="vacio" titulo="No hay órdenes nuevas" mensaje="Cuando entre una, aparecerá aquí.">
//     <button …>Acción opcional</button>
//   </StaffEstado>
export default function StaffEstado({ tipo = 'cargando', titulo, mensaje, onReintentar, filas = 3, children }) {
  if (tipo === 'cargando') {
    return (
      <div className="stfe-skeleton" role="status" aria-live="polite" aria-busy="true">
        <span className="stfe-sr">Cargando…</span>
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="stfe-skeleton__fila" aria-hidden="true">
            <span className="stfe-skeleton__barra stfe-skeleton__barra--larga" />
            <span className="stfe-skeleton__barra stfe-skeleton__barra--corta" />
          </div>
        ))}
      </div>
    )
  }

  const esError = tipo === 'error'
  const Icono = esError ? AlertCircle : Inbox
  return (
    <div className={`stfe-caja ${esError ? 'stfe-caja--error' : ''}`} role={esError ? 'alert' : 'status'}>
      <span className="stfe-caja__icono"><Icono size={22} /></span>
      <p className="stfe-caja__titulo">{titulo || (esError ? 'No se pudo cargar' : 'Sin resultados')}</p>
      {mensaje && <p className="stfe-caja__mensaje">{mensaje}</p>}
      {esError && onReintentar && (
        <button type="button" className="stfe-btn" onClick={onReintentar}>
          <RefreshCw size={15} /> Reintentar
        </button>
      )}
      {children}
    </div>
  )
}
