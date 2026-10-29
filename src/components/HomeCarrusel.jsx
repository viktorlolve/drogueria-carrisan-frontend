import { useRef } from 'react'
import { Link } from 'react-router-dom'
import PromoCard from './PromoCard'
import { useCercaDeViewport } from '../hooks/useCercaDeViewport'
import './HomeCarrusel.css'

// Bloque de vitrina estilo Walmart: título + "Ver todo" + flechas de
// navegación, con una fila de PromoCard con scroll horizontal.
// Reutilizable: se usa tanto en Home.jsx (invitados) como en
function HomeCarrusel({ titulo, subtitulo, productos, tasaVes, verTodoTo = '/catalogo', cargando = false }) {
  const carruselRef = useRef(null)
  // Cuando el bloque se acerca al viewport, las tarjetas dejan de ser "lazy":
  // así la fila entera ya está descargada antes de que el usuario deslice.
  const { refCerca, cerca } = useCercaDeViewport()

  function scrollCarrusel(direccion) {
    carruselRef.current?.scrollBy({ left: direccion * 320, behavior: 'smooth' })
  }

  if (!cargando && (!productos || productos.length === 0)) return null

  return (
    <section className="home-carrusel" ref={refCerca}>
      <div className="home-carrusel__header">
          <div className="home-carrusel__header-textos">
            <h2>{titulo}</h2>
            <p className="home-carrusel__subtitulo">{subtitulo}</p>
          </div>
        <div className="home-carrusel__acciones">
          <Link to={verTodoTo} className="home-carrusel__ver-todo">Ver todo</Link>
          <div className="home-carrusel__flechas">
            <button onClick={() => scrollCarrusel(-1)} aria-label="Anterior">‹</button>
            <button onClick={() => scrollCarrusel(1)} aria-label="Siguiente">›</button>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="home-carrusel__fila" ref={carruselRef}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="home-carrusel__skeleton" key={i} />
          ))}
        </div>
      ) : (
        <div className="home-carrusel__fila" ref={carruselRef}>
          {productos.map((producto) => (
            <PromoCard key={producto.id} producto={producto} tasaVes={tasaVes} prioridad={cerca} />
          ))}
        </div>
      )}
    </section>
  )
}

export default HomeCarrusel