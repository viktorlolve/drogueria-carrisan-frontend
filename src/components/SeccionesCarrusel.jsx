import { useRef } from 'react'
import { Link } from 'react-router-dom'
import MiniPromoCard from './MiniPromoCard'
import { useCercaDeViewport } from '../hooks/useCercaDeViewport'
import './SeccionesCarrusel.css'

// Bloque estilo "Rollbacks & more" de Walmart: varias columnas (una por
// categoría/línea), cada una con un mini-grid 2x2 de MiniPromoCard.
// Todo el bloque de columnas se desplaza horizontalmente como una sola fila.
//
// secciones: [{ id, titulo, verTodoTo, productos: [4 productos] }]
function SeccionesCarrusel({ titulo = 'Rollbacks y más', secciones, cargando = false }) {
  const filaRef = useRef(null)
  // Al acercarse al viewport se descargan todas las fotos de la fila de una vez.
  const { refCerca, cerca } = useCercaDeViewport()

  function scrollFila(direccion) {
    filaRef.current?.scrollBy({ left: direccion * 340, behavior: 'smooth' })
  }

  if (!cargando && (!secciones || secciones.length === 0)) return null

  return (
    <section className="secciones-carrusel" ref={refCerca}>
      <div className="secciones-carrusel__header">
        <h2>{titulo}</h2>
        <div className="secciones-carrusel__flechas">
          <button onClick={() => scrollFila(-1)} aria-label="Anterior">‹</button>
          <button onClick={() => scrollFila(1)} aria-label="Siguiente">›</button>
        </div>
      </div>

      <div className="secciones-carrusel__fila" ref={filaRef}>
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <div className="secciones-carrusel__columna secciones-carrusel__columna--skeleton" key={i}>
                <div className="secciones-carrusel__skeleton-titulo" />
                <div className="secciones-carrusel__grid">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div className="secciones-carrusel__skeleton-card" key={j} />
                  ))}
                </div>
              </div>
            ))
          : secciones.map((seccion) => (
              <div className="secciones-carrusel__columna" key={seccion.id}>
                <div className="secciones-carrusel__columna-header">
                  <h3>{seccion.titulo}</h3>
                  <Link to={seccion.verTodoTo}>Ver todo</Link>
                </div>
                <div className="secciones-carrusel__grid">
                  {seccion.productos.slice(0, 4).map((producto) => (
                    <MiniPromoCard key={producto.id} producto={producto} prioridad={cerca} />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </section>
  )
}

export default SeccionesCarrusel
