import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import TerminosContent from './TerminosContent'
import PrivacidadContent from './PrivacidadContent'
import TerminosComercialesContent from './TerminosComercialesContent'
import './LegalModal.css'

// ---------------------------------------------------------
// Mapa de documentos legales. La clave se usa en los <LegalLink>
// de los formularios de registro.
// ---------------------------------------------------------
const DOCUMENTOS = {
  terminos: {
    titulo: 'Términos y Condiciones de Uso',
    actualizado: 'Última actualización: 12 de agosto de 2026',
    Componente: TerminosContent,
  },
  privacidad: {
    titulo: 'Aviso de Privacidad',
    actualizado: 'Última actualización: 12 de agosto de 2026',
    Componente: PrivacidadContent,
  },
  comercial: {
    titulo: 'Política Comercial',
    actualizado: 'Última actualización: 12 de agosto de 2026',
    Componente: TerminosComercialesContent,
  },
}

// ---------------------------------------------------------
// Botón/enlace que abre el documento en un modal.
// NO navega: el formulario que lo contiene nunca se desmonta,
// así que el usuario no pierde lo que ya escribio.
// ---------------------------------------------------------
export function LegalLink({ doc, children, className = '' }) {
  const [abierto, setAbierto] = useState(false)
  const documento = DOCUMENTOS[doc]

  if (!documento) return children ?? null

  return (
    <>
      <button
        type="button"
        className={`legal-link ${className}`.trim()}
        onClick={(e) => {
          // El enlace suele vivir dentro del <label> del checkbox de
          // aceptacion. Sin esto, el clic bubbles al label y marca la
          // casilla sola — y justamente se debe leer antes de aceptar.
          e.preventDefault()
          e.stopPropagation()
          setAbierto(true)
        }}
      >
        {children}
      </button>
      <LegalModal documento={documento} abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}

// ---------------------------------------------------------
// Modal scrolleable con el documento legal completo.
// Cierra con Esc, con el boton X o clicking en el fondo.
// Bloquea el scroll del body mientras esta abierto.
// ---------------------------------------------------------
export function LegalModal({ documento, abierto, onCerrar }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!abierto) return

    const alPulsarTecla = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsarTecla)

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Mueve el foco al panel para que Esc y el tabulador funcionen
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = overflowAnterior
    }
  }, [abierto, onCerrar])

  if (!abierto || !documento) return null

  const { Componente } = documento

  return (
    <div
      className="legal-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-label={documento.titulo}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="legal-modal__header">
          <div>
            <h2 className="legal-modal__titulo">{documento.titulo}</h2>
            <p className="legal-modal__fecha">{documento.actualizado}</p>
          </div>
          <button
            type="button"
            className="legal-modal__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </header>

        <div className="legal-modal__cuerpo">
          <Componente />
        </div>

        <footer className="legal-modal__footer">
          <p>Tu informacion sigue aqui. Cierra esta ventana para volver al formulario.</p>
          <button type="button" className="legal-modal__btn" onClick={onCerrar}>
            Cerrar y volver al formulario
          </button>
        </footer>
      </div>
    </div>
  )
}

export default LegalModal
