import { useRef } from 'react'
import { FlaskConical, Search } from 'lucide-react'
import { logoParaLaboratorio, nombreVisible } from '../config/laboratoriosLogos'
import LogoTile from './LaboratoriosLogoTile'
import './LaboratoriosCarruselCatalogo.css'

// Carrusel de laboratorios EXCLUSIVO del catálogo (/catalogo).
// A diferencia del LaboratoriosCarrusel compartido (Home), aquí cada tarjeta
// NO navega: alterna el filtro por laboratorio de la grilla en vivo (tocarla
// la agrega/quita de `activos`). Al final va una tarjeta "Buscar más
// laboratorios" que abre el acordeón de laboratorios del panel de filtros.
// El padre ya cargó /products/metadata, así que recibe `laboratorios` como prop.
function LaboratoriosCarruselCatalogo({
  laboratorios = [],
  activos = [],
  onToggle,
  onBuscarMas,
}) {
  const filaRef = useRef(null)

  function scroll(direccion) {
    filaRef.current?.scrollBy({ left: direccion * 260, behavior: 'smooth' })
  }

  if (!laboratorios.length) return null

  return (
    <section className="lcc" aria-label="Laboratorios del catálogo">
      <button
        type="button"
        className="lcc__flecha lcc__flecha--prev"
        onClick={() => scroll(-1)}
        aria-label="Laboratorios anteriores"
      >
        ‹
      </button>

      <div className="lcc__fila" ref={filaRef}>
        {laboratorios.map((lab) => {
          const valor = lab.nombre
          const match = logoParaLaboratorio(valor)
          const activo = activos.includes(valor)
          return (
            <button
              key={valor}
              type="button"
              className={`lcc__card${activo ? ' lcc__card--activo' : ''}`}
              onClick={() => onToggle(valor)}
              aria-pressed={activo}
            >
              <div className="lcc__tile">
                {match ? (
                  <LogoTile
                    laboratorio={valor}
                    logo={match.logo}
                    className="lcc__logo"
                    classNameIcono="lcc__icono"
                  />
                ) : (
                  <FlaskConical className="lcc__icono" strokeWidth={1.6} aria-hidden="true" />
                )}
              </div>
              <span className="lcc__nombre">{nombreVisible(valor)}</span>
            </button>
          )
        })}

        <button
          type="button"
          className="lcc__card lcc__card--mas"
          onClick={onBuscarMas}
        >
          <div className="lcc__tile lcc__tile--mas">
            <Search className="lcc__icono" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <span className="lcc__nombre">Buscar más laboratorios</span>
        </button>
      </div>

      <button
        type="button"
        className="lcc__flecha lcc__flecha--next"
        onClick={() => scroll(1)}
        aria-label="Siguientes laboratorios"
      >
        ›
      </button>
    </section>
  )
}

export default LaboratoriosCarruselCatalogo
