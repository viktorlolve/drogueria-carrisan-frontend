import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
//   const motivo = await pedirTexto({ titulo, obligatorio: true })  // string | null
//
// Todo se pinta en un portal en document.body, así que no lo recorta
// ningún contenedor con overflow del layout.
// ---------------------------------------------------------------
const DURACION_TOAST = { exito: 4200, info: 4200, error: 6500 }

function DialogoConfirmar({ opciones, onResponder }) {
  const botonCancelar = useRef(null)
  const campoRef = useRef(null)
  const uid = useId()
  const [valor, setValor] = useState('')
  const { titulo, texto, textoConfirmar, textoCancelar, peligro, campo } = opciones
  const conCampo = Boolean(campo)
  // Con campo de texto: cancelar → null, aceptar → texto recortado.
  // Sin campo: cancelar → false, aceptar → true.
  const cancelado = conCampo ? null : false
  const aceptarDeshabilitado = conCampo && campo.obligatorio && !valor.trim()

  function aceptar() {
    if (aceptarDeshabilitado) return
    onResponder(conCampo ? valor.trim() : true)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onResponder(conCampo ? null : false)
    }
    const overflowAnterior = document.body.style.overflow
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    if (conCampo) campoRef.current?.focus()
    else botonCancelar.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowAnterior
    }
  }, [onResponder, conCampo])

  const Campo = conCampo && campo.multilinea ? 'textarea' : 'input'

  return createPortal(
    <div className="stfui-portal">
      <div className="stfui-overlay" onClick={() => onResponder(cancelado)}>
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
          {conCampo && (
            <div className="stfui-campo">
              {campo.etiqueta && <label htmlFor={`${uid}-campo`} className="stfui-campo__etiqueta">{campo.etiqueta}</label>}
              <Campo
                id={`${uid}-campo`}
                ref={campoRef}
                className="stfui-campo__input"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder={campo.placeholder}
                rows={campo.multilinea ? 3 : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' && !campo.multilinea) { e.preventDefault(); aceptar() } }}
              />
            </div>
          )}
          <div className="stfui-dialogo__acciones">
            <button ref={botonCancelar} type="button" className="stfui-btn stfui-btn--secundario" onClick={() => onResponder(cancelado)}>
              {textoCancelar}
            </button>
            <button
              type="button"
              className={`stfui-btn ${peligro ? 'stfui-btn--peligro' : 'stfui-btn--primario'}`}
              onClick={aceptar}
              disabled={aceptarDeshabilitado}
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
  const [dialogo, setDialogo] = useState(null)
  const [toast, setToast] = useState(null)
  const pendienteRef = useRef(null) // { resolve, cancelado }
  const timerRef = useRef(null)

  const responder = useCallback((valor) => {
    pendienteRef.current?.resolve(valor)
    pendienteRef.current = null
    setDialogo(null)
  }, [])

  // Abre un diálogo. Si ya había otro abierto se descarta con su valor de cancelación.
  const abrir = useCallback((opciones, cancelado) => new Promise((resolve) => {
    pendienteRef.current?.resolve(pendienteRef.current.cancelado)
    pendienteRef.current = { resolve, cancelado }
    setDialogo(opciones)
  }), [])

  // confirmar({ titulo, texto?, textoConfirmar?, textoCancelar?, peligro? }) → Promise<boolean>
  const confirmar = useCallback((opciones = {}) => abrir({
    titulo: opciones.titulo || '¿Confirmas esta acción?',
    texto: opciones.texto || '',
    textoConfirmar: opciones.textoConfirmar || 'Confirmar',
    textoCancelar: opciones.textoCancelar || 'Cancelar',
    peligro: Boolean(opciones.peligro),
  }, false), [abrir])

  // pedirTexto({ titulo, texto?, etiqueta?, placeholder?, textoConfirmar?, textoCancelar?,
  //              obligatorio?, multilinea?, peligro? }) → Promise<string | null>
  // null = cancelado; string = texto recortado (puede ser '' si no es obligatorio).
  const pedirTexto = useCallback((opciones = {}) => abrir({
    titulo: opciones.titulo || 'Escribe un texto',
    texto: opciones.texto || '',
    textoConfirmar: opciones.textoConfirmar || 'Aceptar',
    textoCancelar: opciones.textoCancelar || 'Cancelar',
    peligro: Boolean(opciones.peligro),
    campo: {
      etiqueta: opciones.etiqueta || '',
      placeholder: opciones.placeholder || '',
      obligatorio: Boolean(opciones.obligatorio),
      multilinea: opciones.multilinea !== false,
    },
  }, null), [abrir])

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

  const valor = useMemo(() => ({ confirmar, pedirTexto, avisar }), [confirmar, pedirTexto, avisar])

  return (
    <StaffUIContext.Provider value={valor}>
      {children}
      {dialogo && <DialogoConfirmar opciones={dialogo} onResponder={responder} />}
      {toast && <Toast toast={toast} onCerrar={cerrarToast} />}
    </StaffUIContext.Provider>
  )
}
