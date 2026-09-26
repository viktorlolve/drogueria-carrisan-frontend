// components/HojaInferior.jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './HojaInferior.css'

/**
 * HojaInferior — Bottom sheet genérico reutilizable.
 * 
 * Overlay + tarjeta que sube desde abajo en móvil, centrada en desktop.
 * Vía portal directo a document.body para evitar quedar atrapada dentro
 * de contenedores con overflow:hidden o transform durante transiciones.
 * 
 * IMPORTANTE — el portal a document.body saca el contenido de la página
 * que lo abre, así que la hoja NO hereda ni las clases ni las custom
 * properties del contenedor padre (tokens `--color-*` scoped a la página,
 * por ejemplo). Por eso el contrato de tokens vive en HojaInferior.css
 * sobre `.hoja-inferior`: cualquier consumidor puede usar `var(--color-*)`
 * dentro de la hoja sin declarar nada. Si necesitás un color que no esté
 * en ese contrato, agregalo ahí (o pasalo por style inline) en vez de
 * duplicarlo en la página.
 * 
 * También bloquea el scroll del body mientras está abierta y cierra con
 * Escape, para que el fondo no se mueva detrás en móvil.
 * 
 * Uso:
 *   <HojaInferior 
 *     titulo="Tu cuenta" 
 *     onCerrar={() => setMostrarModal(false)}
 *   >
 *     ...contenido...
 *   </HojaInferior>
 */
function HojaInferior({ titulo, onCerrar, children }) {
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = overflowPrevio
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCerrar])

  return createPortal(
    <div className="hoja-inferior-overlay" onClick={onCerrar}>
      <div className="hoja-inferior" onClick={(e) => e.stopPropagation()}>
        <div className="hoja-inferior__manija" />
        <div className="hoja-inferior__header">
          <h3>{titulo}</h3>
          <button 
            type="button" 
            className="hoja-inferior__cerrar" 
            onClick={onCerrar} 
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="hoja-inferior__body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export default HojaInferior