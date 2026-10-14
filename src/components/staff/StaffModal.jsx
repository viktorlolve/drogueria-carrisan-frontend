import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import '../../styles/staff-tokens.css'
import './StaffModal.css'

// Modal estándar del staff. Se monta en document.body (portal) porque el
// layout de departamento usa `will-change: transform`, que convierte a su
// contenedor en el bloque de referencia de cualquier `position: fixed`
// descendiente: un modal fijo dentro del layout se posiciona respecto a la
// página, no a la pantalla.
//
//   <StaffModal titulo="Revisar orden #12" onCerrar={cerrar} ancho="md" bloqueado={procesando}>
//     …contenido…
//   </StaffModal>
//
// ancho: 'sm' (420px) | 'md' (620px, por defecto) | 'lg' (820px).
// bloqueado: mientras es true no se cierra con Escape, clic fuera ni la X
// (úsalo mientras hay una petición en curso).
// En pantallas angostas se muestra como hoja inferior.
export default function StaffModal({ titulo, onCerrar, ancho = 'md', bloqueado = false, children }) {
  const uid = useId()
  const panelRef = useRef(null)
  const cerrarRef = useRef(onCerrar)
  const bloqueadoRef = useRef(bloqueado)

  useEffect(() => {
    cerrarRef.current = onCerrar
    bloqueadoRef.current = bloqueado
  })

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !bloqueadoRef.current) cerrarRef.current()
    }
    const overflowAnterior = document.body.style.overflow
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  return createPortal(
    <div className="stfm-portal">
      <div className="stfm-overlay" onClick={() => { if (!bloqueado) onCerrar() }}>
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`stfm-panel stfm-panel--${ancho}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-titulo`}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="stfm-cabecera">
            <h2 id={`${uid}-titulo`} className="stfm-titulo">{titulo}</h2>
            <button type="button" className="stfm-cerrar" onClick={onCerrar} disabled={bloqueado} aria-label="Cerrar">
              <X size={18} />
            </button>
          </header>
          <div className="stfm-cuerpo">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}
