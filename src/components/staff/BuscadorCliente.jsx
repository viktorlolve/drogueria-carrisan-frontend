import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import './BuscadorCliente.css'

// ------------------------------------------------------------------
// Buscador de cliente reutilizable: reemplaza los campos de texto donde
// había que escribir el ID numérico del cliente a mano (Cobros, Notas de
// cobranza en StaffCredito.jsx). Controlado: el padre guarda el cliente
// elegido ({ id, nombre, email }) y lo pasa en `value`.
// ------------------------------------------------------------------
export default function BuscadorCliente({ value, onSeleccionar, placeholder = 'Buscar cliente por nombre, email o RIF...' }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const debounce = useRef(null)
  const seq = useRef(0)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (query.trim().length < 2) {
      // Promise.resolve().then() difiere a una microtarea para no disparar
      // setState síncrono dentro del efecto.
      Promise.resolve().then(() => setResultados([]))
      return
    }
    debounce.current = setTimeout(async () => {
      const id = ++seq.current
      setBuscando(true)
      try {
        const { data } = await staffApi.get('/staff/clientes', { params: { buscar: query.trim() } })
        if (id === seq.current) setResultados(data?.clientes || data || [])
      } catch {
        if (id === seq.current) setResultados([])
      } finally {
        if (id === seq.current) setBuscando(false)
      }
    }, 280)
    return () => clearTimeout(debounce.current)
  }, [query])

  if (value) {
    return (
      <div className="bc-chip">
        <span className="bc-chip-avatar">{(value.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
        <span className="bc-chip-info">
          <strong>{value.nombre || `Cliente #${value.id}`}</strong>
          {value.email && <span>{value.email}</span>}
        </span>
        <button type="button" className="bc-chip-quitar" onClick={() => onSeleccionar(null)} aria-label="Quitar cliente">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="bc-raiz">
      <div className="bc-buscador">
        <Search size={15} />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {buscando && <p className="bc-aviso">Buscando...</p>}
      {!buscando && query.trim().length >= 2 && resultados.length === 0 && (
        <p className="bc-aviso">Sin clientes que coincidan</p>
      )}
      {resultados.length > 0 && (
        <div className="bc-lista">
          {resultados.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              className="bc-item"
              onClick={() => { onSeleccionar(c); setQuery(''); setResultados([]) }}
            >
              <span className="bc-item-avatar">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
              <span className="bc-item-info">
                <span className="bc-item-nombre">{c.nombre || 'Sin nombre'}</span>
                <span className="bc-item-sub">{c.email}{c.rif_cedula ? ` · ${c.rif_cedula}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}