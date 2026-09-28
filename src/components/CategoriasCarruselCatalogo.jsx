import { useRef } from 'react'
import { iconoParaCategoria } from '../config/categoriasIconos'
import { imagenParaCategoria } from '../config/categoriasImagenes'
import './CategoriasCarruselCatalogo.css'

// Carrusel compacto de categorías EXCLUSIVO del catálogo (/catalogo).
// A diferencia del CategoriasCarrusel compartido (Home), aquí no hay tarjeta
// "Ver todo" ni enlace a /catalogo (ya estamos ahí): cada item es un chip que
// filtra la grilla en vivo y el primer chip ("Todo") deselecciona la categoría.
// El padre ya cargó /products/metadata, así que recibe `categorias` como prop.
function CategoriasCarruselCatalogo({ categorias = [], activoId = 'todos', onSeleccionar }) {
  const filaRef = useRef(null)

  function scroll(direccion) {
    filaRef.current?.scrollBy({ left: direccion * 220, behavior: 'smooth' })
  }

  const lista = [{ id: 'todos', nombre: 'Todo', icono: 'LayoutGrid' }, ...categorias]

  return (
    <section className="ccc" aria-label="Categorías del catálogo">
      {lista.length > 1 && (
        <button
          type="button"
          className="ccc__flecha ccc__flecha--prev"
          onClick={() => scroll(-1)}
          aria-label="Categorías anteriores"
        >
          ‹
        </button>
      )}

      <div className="ccc__fila" ref={filaRef}>
        {lista.map((cat) => {
          const Icono = iconoParaCategoria(cat)
          const imagen = imagenParaCategoria(cat.id)
          const activa = activoId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              className={`ccc__chip${activa ? ' ccc__chip--activo' : ''}`}
              onClick={() => onSeleccionar(cat.id)}
              aria-pressed={activa}
            >
              {imagen ? (
                <img src={imagen} alt={cat.nombre} className="ccc__chip-img" loading="lazy" />
              ) : (
                <Icono className="ccc__chip-icono" strokeWidth={2} aria-hidden="true" />
              )}
              <span>{cat.nombre}</span>
            </button>
          )
        })}
      </div>

      {lista.length > 1 && (
        <button
          type="button"
          className="ccc__flecha ccc__flecha--next"
          onClick={() => scroll(1)}
          aria-label="Siguientes categorías"
        >
          ›
        </button>
      )}
    </section>
  )
}

export default CategoriasCarruselCatalogo