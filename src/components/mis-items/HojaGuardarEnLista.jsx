import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Minus, Plus, X } from 'lucide-react'
import useModal from './useModal'
import './MisItems.css'

// ---------------------------------------------------------------
// Hoja "Guardar en lista" (estilo Pinterest / Google Maps).
// Sirve para un producto o para varios a la vez (modo selección):
//
//   · Cada lista es una casilla con 3 estados:
//       marcada     = todos los productos ya están en la lista
//       con guion   = solo algunos
//       vacía       = ninguno
//   · Tocar una lista: si no están todos, agrega los que faltan; si ya
//     están todos, los quita. Se aplica al instante (sin botón "guardar").
//   · Se puede crear una lista nueva aquí mismo y guardar ahí los productos.
// ---------------------------------------------------------------
export default function HojaGuardarEnLista({
  productos,
  listas,
  miembros,
  ocupadas,
  onAlternar,
  onCrear,
  onCerrar,
}) {
  const uid = useId()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const inputRef = useRef(null)
  useModal(onCerrar)

  const titulo = productos.length === 1 ? productos[0].nombre_comercial : `${productos.length} productos`
  const existentes = listas.map((l) => l.nombre.trim().toLowerCase())

  async function crear(e) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) {
      setError('Escribe un nombre para la lista')
      return
    }
    if (existentes.includes(limpio.toLowerCase())) {
      setError('Ya tienes una lista con ese nombre')
      return
    }
    setCreando(true)
    try {
      await onCrear(limpio, productos)
      setNombre('')
      setError('')
    } catch (err) {
      setError(err?.message || 'No se pudo crear la lista')
    } finally {
      setCreando(false)
    }
  }

  return createPortal(
    <div className="fav-portal">
      <div className="fav-overlay" onClick={onCerrar}>
        <div
          className="fav-hoja"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-t`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fav-hoja__asa" aria-hidden="true" />
          <div className="fav-hoja__cab">
            <div className="fav-hoja__titulos">
              <h2 id={`${uid}-t`}>Guardar en lista</h2>
              <p>{titulo}</p>
            </div>
            <button type="button" className="fav-icono-cerrar" onClick={onCerrar} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="fav-hoja__cuerpo">
            {listas.length === 0 ? (
              <p className="fav-hoja__vacio">Aún no tienes listas. Crea la primera aquí abajo.</p>
            ) : (
              <ul className="fav-hoja__listas">
                {listas.map((l) => {
                  const dentro = productos.filter((p) => miembros.get(l.id)?.has(p.id)).length
                  const estado = dentro === 0 ? 'ninguno' : dentro === productos.length ? 'todos' : 'algunos'
                  const ocupada = ocupadas.has(l.id)
                  const total = miembros.get(l.id)?.size || 0
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={estado === 'todos' ? true : estado === 'algunos' ? 'mixed' : false}
                        className="fav-hoja__lista"
                        onClick={() => onAlternar(l, productos, estado === 'todos' ? 'quitar' : 'agregar')}
                        disabled={ocupada}
                      >
                        <span className={`fav-casilla fav-casilla--${estado}`}>
                          {estado === 'todos' && <Check size={14} strokeWidth={3} />}
                          {estado === 'algunos' && <Minus size={14} strokeWidth={3} />}
                        </span>
                        <span className="fav-hoja__lista-info">
                          <strong>{l.nombre}</strong>
                          <small>
                            {total} producto{total !== 1 ? 's' : ''}
                            {estado === 'algunos' && ` · ${dentro} de ${productos.length} seleccionados`}
                          </small>
                        </span>
                        {ocupada && <Loader2 size={16} className="fav-giro" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <form className="fav-hoja__nueva" onSubmit={crear} noValidate>
            <label htmlFor={`${uid}-n`}>Nueva lista</label>
            <div className="fav-hoja__nueva-fila">
              <input
                id={`${uid}-n`}
                ref={inputRef}
                type="text"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setError('') }}
                placeholder="Ej. Antibióticos, Pedido mensual"
                maxLength={60}
                aria-invalid={!!error}
              />
              <button type="submit" className="fav-btn fav-btn--primario" disabled={creando}>
                {creando ? <Loader2 size={16} className="fav-giro" /> : <Plus size={16} />}
                Crear y guardar
              </button>
            </div>
            {error && <p className="fav-error" role="alert">{error}</p>}
          </form>

          <div className="fav-hoja__pie">
            <button type="button" className="fav-btn fav-btn--secundario" onClick={onCerrar}>
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}