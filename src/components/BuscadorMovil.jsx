import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import './BuscadorMovil.css'
import { IconoFlecha } from './icons/IconoFlecha'
import { ProductoImagen } from './icons/ProductoImagen'

const STORAGE_KEY = 'carrisan_busquedas_recientes'
const MAX_RECIENTES = 8

// Términos sugeridos mientras no tengamos analítica real de búsquedas.
// Fácil de ajustar/reemplazar más adelante por los términos más buscados reales.
const TENDENCIAS = [
  'Acetaminofén',
  'Ibuprofeno',
  'Alcohol antiséptico',
  'Suero oral',
  'Vitamina C',
  'Guantes de nitrilo',
]

function leerRecientes() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    return guardado ? JSON.parse(guardado) : []
  } catch {
    return []
  }
}

function guardarRecientes(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
  } catch {
    // localStorage no disponible — no es crítico, simplemente no persiste
  }
}

// Resalta la porción del nombre que coincide con lo escrito, como hace
// Walmart/Amazon en su autocompletado.
function resaltarCoincidencia(nombre, query) {
  const idx = nombre.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{nombre}</>
  return (
    <>
      {nombre.slice(0, idx)}
      <strong>{nombre.slice(idx, idx + query.length)}</strong>
      {nombre.slice(idx + query.length)}
    </>
  )
}

function BuscadorMovil({ onClose, queryInicial = '' }) {
  const [query, setQuery] = useState(queryInicial)
  const [sugerencias, setSugerencias] = useState([])
  const [cargando, setCargando] = useState(false)
  const [recientes, setRecientes] = useState(leerRecientes)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) return
    const debounce = setTimeout(async () => {
      setCargando(true)
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(query.trim())}&limit=8`)
        setSugerencias(data.slice(0, 8))
      } catch (err) {
        console.error('Error buscando sugerencias:', err)
      } finally {
        setCargando(false)
      }
    }, 250)
    return () => clearTimeout(debounce)
  }, [query])

  function registrarReciente(termino) {
    const limpio = termino.trim()
    if (!limpio) return
    setRecientes((prev) => {
      const sinDuplicado = prev.filter((t) => t.toLowerCase() !== limpio.toLowerCase())
      const actualizado = [limpio, ...sinDuplicado].slice(0, MAX_RECIENTES)
      guardarRecientes(actualizado)
      return actualizado
    })
  }

  function eliminarReciente(termino, e) {
    e.stopPropagation()
    setRecientes((prev) => {
      const actualizado = prev.filter((t) => t !== termino)
      guardarRecientes(actualizado)
      return actualizado
    })
  }

  function irACatalogo(termino) {
    registrarReciente(termino)
    navigate(`/catalogo?search=${encodeURIComponent(termino)}`)
    onClose()
  }

  function irAProducto(producto) {
    registrarReciente(query.trim() || producto.nombre_comercial)
    navigate(`/producto/${producto.id}`)
    onClose()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const termino = query.trim()
    if (termino) irACatalogo(termino)
  }

  const mostrandoResultados = query.trim().length > 0
  const sugerenciasVisibles = query.trim().length < 1 ? [] : sugerencias

  return (
    <div className="buscador-movil" role="dialog" aria-modal="true">
      <div className="buscador-movil__header">
        <button
          type="button"
          className="buscador-movil__volver"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        <form className="buscador-movil__form" onSubmit={handleSubmit}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            placeholder="Buscar en Drogueria Carrisan"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="buscador-movil__limpiar"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      <div className="buscador-movil__body">
        {!mostrandoResultados && (
          <>
            {recientes.length > 0 && (
              <section className="buscador-movil__seccion">
                <h2>Tus búsquedas recientes</h2>
                <div className="buscador-movil__lista">
                  {recientes.map((termino) => (
                    <button
                      key={termino}
                      type="button"
                      className="buscador-movil__item-reciente"
                      onClick={() => irACatalogo(termino)}
                    >
                      <span className="buscador-movil__item-icono">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9"></circle>
                          <polyline points="12 7 12 12 15 15"></polyline>
                        </svg>
                      </span>
                      <span className="buscador-movil__item-texto">{termino}</span>
                      <span
                        className="buscador-movil__item-borrar"
                        onClick={(e) => eliminarReciente(termino, e)}
                        role="button"
                        aria-label={`Eliminar "${termino}" de búsquedas recientes`}
                      >
                        ✕
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="buscador-movil__seccion">
              <h2>Tendencias</h2>
              <div className="buscador-movil__pills">
                {TENDENCIAS.map((termino) => (
                  <button
                    key={termino}
                    type="button"
                    className="buscador-movil__pill"
                    onClick={() => irACatalogo(termino)}
                  >
                    {termino}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {mostrandoResultados && (
          <div className="buscador-movil__resultados">
            {cargando ? (
              <div className="buscador-movil__cargando">Buscando...</div>
            ) : sugerenciasVisibles.length === 0 ? (
              <div className="buscador-movil__sin-resultados">
                <p>Sin coincidencias para "{query}"</p>
                <button type="button" className="buscador-movil__ver-todo" onClick={() => irACatalogo(query)}>
                  Buscar en todo el catálogo
                </button>
              </div>
            ) : (
              <>
                {sugerenciasVisibles.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    className="buscador-movil__sugerencia"
                    onClick={() => irAProducto(producto)}
                  >
                    <ProductoImagen
                      src={producto.foto_url}
                      alt={producto.nombre_comercial}
                      className="buscador-movil__sugerencia-img"
                    />
                    <span className="buscador-movil__sugerencia-nombre">
                      {resaltarCoincidencia(producto.nombre_comercial, query)}
                    </span>
                    <span className="buscador-movil__sugerencia-precio">
                      ${Number(producto.precio_usd).toFixed(2)}
                    </span>
                    <IconoFlecha size={20} />
                  </button>
                ))}

                <button type="button" className="buscador-movil__ver-todo" onClick={() => irACatalogo(query)}>
                  Ver todos los resultados para "{query}"
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BuscadorMovil
