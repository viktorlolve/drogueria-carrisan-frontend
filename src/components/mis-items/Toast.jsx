import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import './MisItems.css'

// Aviso flotante con acción opcional ("Deshacer"). Se monta en document.body.
// El hook que lo controla vive en useToast.js (react-refresh no permite mezclar).
export default function Toast({ toast, onCerrar, sobreBarra = false }) {
  if (!toast) return null
  const esError = toast.tipo === 'error'
  return createPortal(
    <div className="fav-portal">
      <div
        className={`fav-toast fav-toast--${toast.tipo} ${sobreBarra ? 'fav-toast--alto' : ''}`}
        role={esError ? 'alert' : 'status'}
      >
        {esError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
        <span className="fav-toast__texto">{toast.texto}</span>
        {toast.accion && (
          <button
            type="button"
            className="fav-toast__accion"
            onClick={() => { toast.accion.onClick(); onCerrar() }}
          >
            {toast.accion.label}
          </button>
        )}
        <button type="button" className="fav-toast__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  )
}