import { useState } from 'react'
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react'
import './MisItems.css'

// Filtros por línea de producto — iguales en las dos pestañas para que se
// vean y se comporten de forma consistente.
const LINEAS_FILTRO = [
  { id: 'todo', nombre: 'Todo' },
  { id: 'Linea Hospitalaria', nombre: 'Línea hospitalaria' },
  { id: 'Linea Farmacia', nombre: 'Línea farmacia' },
  { id: 'Material Medico', nombre: 'Material médico' },
]

// Buscador + filtro por línea (colapsable) + vista cuadrícula/lista.
// `extra` permite colgar acciones propias de cada pestaña (ej. "Seleccionar").
export default function BarraHerramientas({
  busqueda,
  onBusqueda,
  placeholder,
  lineaActiva,
  onLinea,
  vista,
  onVista,
  extra,
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <div className="fav-barra">
        <div className="fav-buscador">
          <Search size={17} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
          {busqueda && (
            <button type="button" className="fav-buscador__limpiar" onClick={() => onBusqueda('')} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`fav-barra__btn ${lineaActiva !== 'todo' ? 'fav-barra__btn--on' : ''}`}
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
        >
          <SlidersHorizontal size={16} />
          <span>Filtros</span>
        </button>

        {extra}

        <div className="fav-vista" role="group" aria-label="Vista">
          <button type="button" className={vista === 'lista' ? 'fav-vista--on' : ''} onClick={() => onVista('lista')} aria-label="Vista de lista" aria-pressed={vista === 'lista'}>
            <List size={18} />
          </button>
          <button type="button" className={vista === 'grid' ? 'fav-vista--on' : ''} onClick={() => onVista('grid')} aria-label="Vista de cuadrícula" aria-pressed={vista === 'grid'}>
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="fav-filtros">
          <p>Tipo de producto</p>
          <div className="fav-filtros__chips">
            {LINEAS_FILTRO.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`fav-chip-filtro ${lineaActiva === l.id ? 'fav-chip-filtro--on' : ''}`}
                onClick={() => onLinea(l.id)}
                aria-pressed={lineaActiva === l.id}
              >
                {l.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}