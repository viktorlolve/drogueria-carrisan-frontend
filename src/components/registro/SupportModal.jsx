import { useEffect, useRef, useState } from 'react'
import { X, Clock } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import CONTACTO from '../../config/contacto'
import './SupportModal.css'

// ---------------------------------------------------------
// Boton que abre los datos de soporte en un modal, IGUAL que
// hace <LegalLink> con los documentos legales. No navega: asi el
// formulario de registro nunca se desmonta y el usuario no pierde
// lo que ya escribio.
//
// Es deliberadamente corto: solo WhatsApp y el horario. Para
// ver el resto de los canales (correo, telefono, sede) esta la
// pagina /contacto completa.
// ---------------------------------------------------------
export function SupportLink({ children, className = '' }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`support-link ${className}`.trim()}
        onClick={() => setAbierto(true)}
      >
        {children}
      </button>
      <SupportModal abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}

export function SupportModal({ abierto, onCerrar }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!abierto) return

    const alPulsarTecla = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsarTecla)

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = overflowAnterior
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="support-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="support-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Datos de soporte"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="support-modal__header">
          <h2 className="support-modal__titulo">Soporte</h2>
          <button
            type="button"
            className="support-modal__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="support-modal__cuerpo">
          {/* WhatsApp */}
          <a
            className="support-modal__wa"
            href={CONTACTO.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="support-modal__wa-icono" aria-hidden="true">
              <FaWhatsapp size={22} />
            </span>
            <span className="support-modal__wa-texto">
              <strong>{CONTACTO.whatsapp.texto}</strong>
              <span>Escríbenos por WhatsApp</span>
            </span>
          </a>

          {/* Horario */}
          <div className="support-modal__bloque">
            <h3 className="support-modal__subtitulo">
              <Clock size={15} aria-hidden="true" />
              Horario de atención
            </h3>
            <ul className="support-modal__horario">
              {CONTACTO.horario.map((fila) => (
                <li
                  key={fila.dias}
                  className={fila.rango === 'Cerrado' ? 'es-cerrado' : ''}
                >
                  <span>{fila.dias}</span>
                  <span>{fila.rango}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="support-modal__nota">{CONTACTO.tiempoRespuesta}</p>
        </div>

        <footer className="support-modal__footer">
          <button type="button" className="support-modal__btn" onClick={onCerrar}>
            Cerrar y volver al formulario
          </button>
        </footer>
      </div>
    </div>
  )
}

export default SupportModal
