import { Link } from 'react-router-dom'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './Cotizaciones.css'

function Cotizaciones() {
  return (
    <LayoutPaginaPrincipal activo="cotizaciones" titulo="Cotizaciones" nav={NAV_UNIFICADO}>
      <div className="cot-coming">
        <div className="cot-coming__badge">En construcción</div>

        <div className="cot-coming__icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="56" height="40" x="4" y="12" rx="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 32 h44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="46" r="3" fill="currentColor" />
            <circle cx="44" cy="46" r="3" fill="currentColor" />
            <path d="M28 14 v10 l6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="cot-coming__titulo">Cotizaciones</h1>
        <p className="cot-coming__subtitulo">
          Esta función se está preparando con mucho cuidado para que puedas solicitar
          precios y recibir cotizaciones de los productos que necesitas.
        </p>

        <p className="cot-coming__aviso">
          <strong>Pronto estará disponible.</strong> Mientras tanto, puedes explorar el
          catálogo y usar los requerimientos para consultar lo que buscas.
        </p>

        <div className="cot-coming__acciones">
          <Link to="/catalogo" className="cot-coming__btn cot-coming__btn--primario">
            Ir al catálogo
          </Link>
          <Link to="/mis-solicitudes/requerimientos" className="cot-coming__btn cot-coming__btn--secundario">
            Ver requerimientos
          </Link>
        </div>
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default Cotizaciones
