import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import api from '../api/axios'
import { logoParaLaboratorio, nombreVisible } from '../config/laboratoriosLogos'
import LogoTile from './LaboratoriosLogoTile'
import './ExploraCarrusel.css'
import './LaboratoriosCarrusel.css'

const MAX_TILES = 20

// Carrusel "Explorá por laboratorio": mismo comportamiento visual que
// CategoriasCarrusel pero con logos de marca (mapa en laboratoriosLogos.js).
// Los links apuntan a /catalogo?laboratorio=<valor exacto de la BD>,
// así que siempre traen resultados.
//
// Recibe opcionalmente `laboratoriosTop` del padre (evita fetch extra);
// si no se pasa, hace su propio fetch a /products/metadata.
function LaboratoriosCarrusel({
  titulo = 'Explorá por laboratorio',
  laboratoriosTop,
  verTodoTo = '/catalogo',
}) {
  const filaRef = useRef(null)
  const [cargados, setCargados] = useState([])

  useEffect(() => {
    if (laboratoriosTop !== undefined) return
    let vivo = true
    api
      .get('/products/metadata')
      .then((res) => {
        if (!vivo) return
        setCargados(res.data.laboratoriosTop || [])
      })
      .catch((err) => console.error('Error al cargar laboratorios:', err))
    return () => { vivo = false }
  }, [laboratoriosTop])

  function scroll(direccion) {
    filaRef.current?.scrollBy({ left: direccion * 260, behavior: 'smooth' })
  }

  const fuente = laboratoriosTop !== undefined ? laboratoriosTop : cargados
  const lista = (fuente || []).slice(0, MAX_TILES)

  if (!lista.length) return null

  return (
    <section className="explora-carrusel">
      <div className="explora-carrusel__header">
        <h2 className="explora-carrusel__titulo">{titulo}</h2>
        <div className="explora-carrusel__acciones">
          <Link to={verTodoTo} className="explora-carrusel__ver-todo">Ver todo</Link>
          <div className="explora-carrusel__flechas">
            <button type="button" onClick={() => scroll(-1)} aria-label="Anterior">‹</button>
            <button type="button" onClick={() => scroll(1)} aria-label="Siguiente">›</button>
          </div>
        </div>
      </div>

      <div className="explora-carrusel__fila" ref={filaRef}>
        {lista.map((lab) => {
          const valor = lab.nombre
          const match = logoParaLaboratorio(valor)
          return (
            <Link
              key={valor}
              to={`/catalogo?laboratorio=${encodeURIComponent(valor)}`}
              className="explora-carrusel__card"
            >
              <div className="explora-carrusel__card-img-wrap lab-car__tile">
                {match ? (
                  <LogoTile laboratorio={valor} logo={match.logo} />
                ) : (
                  <FlaskConical className="cat-car__icono" strokeWidth={1.6} aria-hidden="true" />
                )}
              </div>
              <span className="explora-carrusel__card-nombre">{nombreVisible(valor)}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default LaboratoriosCarrusel
