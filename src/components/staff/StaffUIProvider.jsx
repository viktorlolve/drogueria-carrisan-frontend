import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { StaffUIContext } from '../../context/staffUIContext'
import '../../styles/staff-tokens.css'
import './StaffUI.css'

// ---------------------------------------------------------------
// Confirmaciones y avisos propios del staff (reemplazan window.confirm
// y window.alert). Se usan desde cualquier página con useStaffUI():
//
//   const { confirmar, avisar } = useStaffUI()
//
// Ambos se pintan en un portal en document.body, así que no los recorta
// ningún contenedor con overflow del layout.
// ---------------------------------------------------------------
const DURACION_TOAST = { exito: 4200, info: 4200, error: 6500 }

function DialogoConfirmar({ opciones, onResponder }) {
  const botonCancelar = useRef(null)
  const { titulo, texto, textoConfirmar, textoCancelar, peligro } = opciones

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onResponder(false)
    }
    const overflowAnterior = document.body.style.overflow
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    botonCancelar.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowAnterior
    }
  }, [onResponder])

  return createPortal(
    <div className="stfui-portal">
      <div className="stfui-overlay" onClick={() => onResponder(false)}>
        <div
          className="stfui-dialogo"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="stfui-dialogo-titulo"
          aria-describedby={texto ? 'stfui-dialogo-texto' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="stfui-dialogo-titulo" className="stfui-dialogo__titulo">{titulo}</h2>
          {texto && <p id="stfui-dialogo-texto" className="stfui-dialogo__texto">{texto}</p>}
          <div className="stfui-dialogo__acciones">
            <button ref={botonCancelar} type="button" className="stfui-btn stfui-btn--secundario" onClick={() => onResponder(false)}>
              {textoCancelar}
            </button>
            <button
              type="button"
              className={`stfui-btn ${peligro ? 'stfui-btn--peligro' : 'stfui-btn--primario'}`}
              onClick={() => onResponder(true)}
            >
              {textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Toast({ toast, onCerrar }) {
  const esError = toast.tipo === 'error'
  const Icono = esError ? AlertCircle : toast.tipo === 'info' ? Info : CheckCircle2
  return createPortal(
    <div className="stfui-portal">
      <div className={`stfui-toast stfui-toast--${toast.tipo}`} role={esError ? 'alert' : 'status'}>
        <Icono size={18} />
        <span className="stfui-toast__texto">{toast.mensaje}</span>
        <button type="button" className="stfui-toast__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export default function StaffUIProvider({ children }) {
  const [confirmacion, setConfirmacion] = useState(null)
  const [toast, setToast] = useState(null)
  const resolverRef = useRef(null)
  const timerRef = useRef(null)

  const responder = useCallback((valor) => {
    resolverRef.current?.(valor)
    resolverRef.current = null
    setConfirmacion(null)
  }, [])

  // confirmar({ titulo, texto?, textoConfirmar?, textoCancelar?, peligro? }) → Promise<boolean>
  const confirmar = useCallback((opciones = {}) => new Promise((resolve) => {
    // Si ya había una confirmación abierta se descarta como "no".
    resolverRef.current?.(false)
    resolverRef.current = resolve
    setConfirmacion({
      titulo: opciones.titulo || '¿Confirmas esta acción?',
      texto: opciones.texto || '',
      textoConfirmar: opciones.textoConfirmar || 'Confirmar',
      textoCancelar: opciones.textoCancelar || 'Cancelar',
      peligro: Boolean(opciones.peligro),
    })
  }), [])

  const cerrarToast = useCallback(() => {
    clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  // avisar(mensaje, tipo?) — tipo: 'exito' (por defecto) | 'error' | 'info'
  const avisar = useCallback((mensaje, tipo = 'exito') => {
    const tipoFinal = tipo === 'error' || tipo === 'info' ? tipo : 'exito'
    const id = `${Date.now()}-${Math.random()}`
    clearTimeout(timerRef.current)
    setToast({ id, mensaje: String(mensaje ?? ''), tipo: tipoFinal })
    timerRef.current = setTimeout(() => {
      setToast((actual) => (actual && actual.id === id ? null : actual))
    }, DURACION_TOAST[tipoFinal])
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const valor = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar])

  return (
    <StaffUIContext.Provider value={valor}>
      {children}
      {confirmacion && <DialogoConfirmar opciones={confirmacion} onResponder={responder} />}
      {toast && <Toast toast={toast} onCerrar={cerrarToast} />}
    </StaffUIContext.Provider>
  )
}
