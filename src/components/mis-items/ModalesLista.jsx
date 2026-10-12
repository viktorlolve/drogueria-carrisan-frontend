import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import api from '../../api/axios'
import useModal from './useModal'
import './MisItems.css'

// ---------------------------------------------------------------
// Modales de Mis Items. Todos se montan en document.body (portal) a
// propósito: así quedan fuera de .ppal-shift (el contenedor que el
// layout empuja cuando el drawer móvil está abierto) y nunca se recortan.
// ---------------------------------------------------------------

function Marco({ titulo, subtitulo, onCerrar, children, ancho = 'normal', labelledBy }) {
  return createPortal(
    <div className="fav-portal">
      <div className="fav-overlay fav-overlay--centrado" onClick={onCerrar}>
        <div
          className={`fav-modal fav-modal--${ancho}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fav-modal__cab">
            <div>
              <h2 id={labelledBy}>{titulo}</h2>
              {subtitulo && <p>{subtitulo}</p>}
            </div>
            <button type="button" className="fav-icono-cerrar" onClick={onCerrar} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------- Crear / renombrar lista ----------
export function ModalNombreLista({ titulo, textoBoton, inicial = '', existentes, sugerencias = [], guardando, onGuardar, onCerrar }) {
  const uid = useId()
  const [nombre, setNombre] = useState(inicial)
  const [error, setError] = useState('')
  useModal(() => { if (!guardando) onCerrar() })

  function enviar(e) {
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
    onGuardar(limpio)
  }

  return (
    <Marco titulo={titulo} onCerrar={() => { if (!guardando) onCerrar() }} labelledBy={`${uid}-t`}>
      <form className="fav-modal__cuerpo" onSubmit={enviar} noValidate>
        <label className="fav-etiqueta" htmlFor={`${uid}-n`}>Nombre de la lista</label>
        <input
          id={`${uid}-n`}
          className="fav-input"
          type="text"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError('') }}
          placeholder="Ej. Pedido mensual"
          maxLength={60}
          autoFocus
          aria-invalid={!!error}
        />
        {error && <p className="fav-error" role="alert">{error}</p>}

        {sugerencias.length > 0 && (
          <div className="fav-sugerencias" aria-label="Sugerencias de nombre">
            {sugerencias.map((s) => (
              <button key={s} type="button" className="fav-sugerencia" onClick={() => { setNombre(s); setError('') }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="fav-modal__acciones">
          <button type="button" className="fav-btn fav-btn--secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="fav-btn fav-btn--primario" disabled={guardando}>
            {guardando ? <><Loader2 size={16} className="fav-giro" /> Guardando…</> : textoBoton}
          </button>
        </div>
      </form>
    </Marco>
  )
}

// ---------- Confirmación (reemplaza confirm() del navegador) ----------
export function ModalConfirmar({ titulo, texto, textoConfirmar, procesando, onConfirmar, onCerrar }) {
  const uid = useId()
  useModal(() => { if (!procesando) onCerrar() })
  return createPortal(
    <div className="fav-portal">
      <div className="fav-overlay fav-overlay--centrado" onClick={() => { if (!procesando) onCerrar() }}>
        <div
          className="fav-confirmar"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${uid}-t`}
          aria-describedby={`${uid}-d`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={`${uid}-t`}>{titulo}</h2>
          <p id={`${uid}-d`}>{texto}</p>
          <div className="fav-modal__acciones">
            <button type="button" className="fav-btn fav-btn--secundario" onClick={onCerrar} disabled={procesando}>
              Cancelar
            </button>
            <button type="button" className="fav-btn fav-btn--peligro" onClick={onConfirmar} disabled={procesando}>
              {procesando ? <><Loader2 size={16} className="fav-giro" /> Eliminando…</> : textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------- Buscador en vivo de productos ----------
function BuscadorProductos({ yaEsta, onAgregar }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [agregados, setAgregados] = useState(() => new Set())
  const [agregando, setAgregando] = useState(null)

  useEffect(() => {
    const termino = query.trim()
    if (termino.length < 1) return
    let activo = true
    const debounce = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(termino)}&limit=8`)
        if (activo) setResultados(data.slice(0, 8))
      } catch {
        if (activo) setResultados([])
      } finally {
        if (activo) setBuscando(false)
      }
    }, 250)
    return () => { activo = false; clearTimeout(debounce) }
  }, [query])

  const visibles = query.trim().length < 1 ? [] : resultados

  async function agregar(producto) {
    setAgregando(producto.id)
    try {
      await onAgregar(producto)
      setAgregados((prev) => new Set(prev).add(producto.id))
    } finally {
      setAgregando(null)
    }
  }

  return (
    <div className="fav-buscador-prod">
      <div className="fav-buscador">
        <Search size={17} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre…"
          aria-label="Buscar producto"
          autoFocus
        />
      </div>

      {buscando && <p className="fav-estado-texto">Buscando…</p>}
      {!buscando && query.trim().length > 0 && visibles.length === 0 && (
        <p className="fav-estado-texto">No se encontraron productos para “{query.trim()}”.</p>
      )}

      {visibles.length > 0 && (
        <ul className="fav-resultados">
          {visibles.map((p) => {
            const listo = agregados.has(p.id) || yaEsta(p)
            return (
              <li key={p.id} className="fav-resultado">
                <span className="fav-resultado__media">
                  {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span>Sin imagen</span>}
                </span>
                <span className="fav-resultado__info">
                  <strong>{p.nombre_comercial}</strong>
                  <small>${Number(p.precio_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                </span>
                <button
                  type="button"
                  className={`fav-resultado__btn ${listo ? 'fav-resultado__btn--listo' : ''}`}
                  onClick={() => agregar(p)}
                  disabled={listo || agregando === p.id}
                  aria-label={listo ? `${p.nombre_comercial} ya agregado` : `Agregar ${p.nombre_comercial}`}
                >
                  {agregando === p.id ? <Loader2 size={15} className="fav-giro" /> : listo ? <Check size={15} /> : <Plus size={15} />}
                  {listo ? 'Agregado' : 'Agregar'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------- Agregar productos ----------
// modo 'favoritos': solo buscador → agrega a favoritos (vista "Todos").
// modo 'lista':     pestañas "Mis favoritos" (selección múltiple) y "Buscar" → agrega a la lista.
export function ModalAgregarProductos({ modo, lista, favoritos, idsEnLista, yaEsta, onAgregarUno, onAgregarVarios, onCerrar }) {
  const uid = useId()
  const [pestana, setPestana] = useState(modo === 'lista' && favoritos.length > 0 ? 'favoritos' : 'buscar')
  const [elegidos, setElegidos] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)
  useModal(() => { if (!guardando) onCerrar() })

  const disponibles = useMemo(
    () => favoritos.filter((f) => !idsEnLista.has(f.id)),
    [favoritos, idsEnLista]
  )

  function alternar(id) {
    setElegidos((prev) => {
      const sig = new Set(prev)
      if (sig.has(id)) sig.delete(id)
      else sig.add(id)
      return sig
    })
  }

  async function agregarElegidos() {
    setGuardando(true)
    try {
      await onAgregarVarios(disponibles.filter((f) => elegidos.has(f.id)))
      onCerrar()
    } finally {
      setGuardando(false)
    }
  }

  const titulo = modo === 'lista' ? `Agregar a “${lista.nombre}”` : 'Agregar a favoritos'

  return (
    <Marco titulo={titulo} onCerrar={() => { if (!guardando) onCerrar() }} ancho="ancho" labelledBy={`${uid}-t`}>
      {modo === 'lista' && (
        <div className="fav-pestanas" role="tablist" aria-label="Origen de los productos">
          <button type="button" role="tab" aria-selected={pestana === 'favoritos'} className={`fav-pestana ${pestana === 'favoritos' ? 'fav-pestana--activa' : ''}`} onClick={() => setPestana('favoritos')}>
            Mis favoritos
          </button>
          <button type="button" role="tab" aria-selected={pestana === 'buscar'} className={`fav-pestana ${pestana === 'buscar' ? 'fav-pestana--activa' : ''}`} onClick={() => setPestana('buscar')}>
            Buscar
          </button>
        </div>
      )}

      <div className="fav-modal__cuerpo fav-modal__cuerpo--scroll">
        {pestana === 'favoritos' ? (
          disponibles.length === 0 ? (
            <p className="fav-estado-texto">
              {favoritos.length === 0
                ? 'Aún no tienes favoritos. Usa la pestaña Buscar para agregar productos.'
                : 'Todos tus favoritos ya están en esta lista.'}
            </p>
          ) : (
            <ul className="fav-resultados">
              {disponibles.map((f) => {
                const sel = elegidos.has(f.id)
                return (
                  <li key={f.id}>
                    <button type="button" role="checkbox" aria-checked={sel} className={`fav-resultado fav-resultado--sel ${sel ? 'fav-resultado--on' : ''}`} onClick={() => alternar(f.id)}>
                      <span className={`fav-casilla fav-casilla--${sel ? 'todos' : 'ninguno'}`}>{sel && <Check size={14} strokeWidth={3} />}</span>
                      <span className="fav-resultado__media">
                        {f.foto_url ? <img src={f.foto_url} alt="" loading="lazy" /> : <span>Sin imagen</span>}
                      </span>
                      <span className="fav-resultado__info">
                        <strong>{f.nombre_comercial}</strong>
                        <small>${Number(f.precio_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        ) : (
          <BuscadorProductos yaEsta={yaEsta} onAgregar={onAgregarUno} />
        )}
      </div>

      {pestana === 'favoritos' && disponibles.length > 0 ? (
        <div className="fav-modal__acciones fav-modal__acciones--pie">
          <button type="button" className="fav-btn fav-btn--secundario" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button type="button" className="fav-btn fav-btn--primario" onClick={agregarElegidos} disabled={guardando || elegidos.size === 0}>
            {guardando ? <><Loader2 size={16} className="fav-giro" /> Agregando…</> : `Agregar${elegidos.size ? ` (${elegidos.size})` : ''}`}
          </button>
        </div>
      ) : (
        <div className="fav-modal__acciones fav-modal__acciones--pie">
          <button type="button" className="fav-btn fav-btn--secundario" onClick={onCerrar}>Cerrar</button>
        </div>
      )}
    </Marco>
  )
}