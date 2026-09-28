import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { iconoParaCategoria } from '../config/categoriasIconos'
import { imagenParaCategoria } from '../config/categoriasImagenes'
import './ExploraCarrusel.css'
import './CategoriasCarrusel.css'

const ITEM_TODOS = { id: 'todos', nombre: 'Todo', icono: 'LayoutGrid' }

// Carrusel de categorías de la tienda (mismas 16 categorías de categorias_tienda).
// Dos modos:
//  - "enlace": sin `onSeleccionar` → cada tarjeta es un <Link> a /catalogo?categoria=<id>
//    (usado en Home como "Explorá por categoría").
//  - "selección": con `onSeleccionar` → las tarjetas son botones que actualizan el
//    catálogo en vivo (usado en /catalogo). `activoId` marca la tarjeta activa.
// `categorias` es opcional: si el padre ya cargó /products/metadata lo pasa para no
// re-fetchar; de lo contrario el componente hace su propio fetch.
function CategoriasCarrusel({
  titulo = 'Explorá por categoría',
  categorias,
  activoId = 'todos',
  onSeleccionar,
  verTodoTo = '/catalogo',
}) {
  const filaRef = useRef(null)
  const [categoriasCargadas, setCategoriasCargadas] = useState([])

  useEffect(() => {
    if (categorias !== undefined) return
    let vivo = true
    api
      .get('/products/metadata')
      .then((res) => {
        if (!vivo) return
        setCategoriasCargadas(res.data.categorias || [])
      })
      .catch((err) => console.error('Error al cargar categorías:', err))
    return () => {
      vivo = false
    }
  }, [categorias])

  function scroll(direccion) {
    filaRef.current?.scrollBy({ left: direccion * 260, behavior: 'smooth' })
  }

  const esSeleccion = typeof onSeleccionar === 'function'
  const fuente = categorias !== undefined ? categorias : categoriasCargadas
  const lista = [ITEM_TODOS, ...fuente]

  return (
    <section className="explora-carrusel">
      <div className="explora-carrusel__header">
        <h2 className="explora-carrusel__titulo">{titulo}</h2>
        <div className="explora-carrusel__acciones">
          {esSeleccion ? (
            <button
              type="button"
              className="explora-carrusel__ver-todo cat-car__ver-todo"
              onClick={() => onSeleccionar('todos')}
            >
              Ver todo
            </button>
          ) : (
            <Link to={verTodoTo} className="explora-carrusel__ver-todo">Ver todo</Link>
          )}
          <div className="explora-carrusel__flechas">
            <button type="button" onClick={() => scroll(-1)} aria-label="Anterior">‹</button>
            <button type="button" onClick={() => scroll(1)} aria-label="Siguiente">›</button>
          </div>
        </div>
      </div>

      <div className="explora-carrusel__fila" ref={filaRef}>
        {lista.map((cat) => {
          const Icono = iconoParaCategoria(cat)
          const imagen = imagenParaCategoria(cat.id)
          const activo = esSeleccion && activoId === cat.id
          const contenido = (
            <>
              <div className={`explora-carrusel__card-img-wrap cat-car__tile${imagen ? ' has-img' : ''}`}>
                {imagen ? (
                  <img
                    src={imagen}
                    alt={cat.nombre}
                    className="cat-car__img"
                    loading="lazy"
                  />
                ) : (
                  <Icono className="cat-car__icono" strokeWidth={1.6} aria-hidden="true" />
                )}
              </div>
              <span className="explora-carrusel__card-nombre">{cat.nombre}</span>
            </>
          )

          if (esSeleccion) {
            return (
              <button
                key={cat.id}
                type="button"
                className={`explora-carrusel__card cat-car__btn${activo ? ' cat-car__activo' : ''}`}
                onClick={() => onSeleccionar(cat.id)}
              >
                {contenido}
              </button>
            )
          }

          return (
            <Link
              key={cat.id}
              to={cat.id === 'todos' ? verTodoTo : `/catalogo?categoria=${encodeURIComponent(cat.id)}`}
              className="explora-carrusel__card"
            >
              {contenido}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default CategoriasCarrusel