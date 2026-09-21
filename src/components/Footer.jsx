import { Link } from 'react-router-dom'
import { FaWhatsapp, FaMapMarkerAlt } from 'react-icons/fa'
import logoBlanco from '../assets/minilogo blanco sin fondo.png'
import './Footer.css'

const COLUMNAS = [
  {
    titulo: 'Droguería Carrisán',
    enlaces: [
      { texto: 'Quiénes Somos', to: '/quienes-somos' },
      { texto: 'Catálogo', to: '/catalogo' },
      { texto: 'Registro sanitario (INHRR)', to: '/registro-inhrr' },
      { texto: 'Vademécum clínico', to: '/vademecum' },
      { texto: 'Noticias', to: '/noticias' },
      { texto: 'Términos y Condiciones', to: '/terminos' },
      { texto: 'Privacidad', to: '/privacidad' },
    ],
  },
  {
    titulo: 'Mi cuenta',
    enlaces: [
      { texto: 'Mis órdenes', to: '/orders' },
      { texto: 'Estado de cuenta', to: '/estado-cuenta' },
      { texto: 'Direcciones', to: '/direcciones' },
      { texto: 'Ofertas', to: '/ofertas' },
      { texto: 'Presupuesto', to: '/presupuesto' },
    ],
  },
  {
    titulo: 'Ayuda',
    enlaces: [
      { texto: 'Centro de ayuda', to: '/ayuda' },
      { texto: 'Cómo comprar', to: '/ayuda#como-comprar' },
      { texto: 'Preguntas frecuentes', to: '/ayuda#faq' },
      { texto: 'Chat', to: '/chat' },
      { texto: 'Contacto', to: '/contacto' },
    ],
  },
]

const CONTACTO = 'dcarrisan@gmail.com'
const WHATSAPP = {
  texto: '+58 414 5949532',
  enlace: 'https://wa.link/imsb5w',
}
const DIRECCION = {
  texto: 'Av Urdaneta (99) Qta Mirabal, Local 04C, Valencia 2001, Carabobo, Venezuela',
  enlace: 'https://maps.app.goo.gl/pm3MwK1r9JX5R4s9A',
}

function Footer() {
  const anioActual = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Bloque de marca + contacto */}
        <div className="footer-marca">
          <img src={logoBlanco} alt="Droguería Carrisán" className="footer-logo" />
          <p className="footer-tagline">La plataforma digital de abastecimiento farmacéutico y hospitalario para clínicas, farmacias, centros quirúrgicos y medicos cirujanos.</p>
          <ul className="footer-contacto">
            <li>
              <span className="footer-contacto__icon" aria-hidden="true">✉</span>
              <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>
            </li>
            <li>
              <span className="footer-contacto__icon"><FaWhatsapp size={14} /></span>
              <a href={WHATSAPP.enlace} target="_blank" rel="noopener noreferrer">{WHATSAPP.texto}</a>
            </li>
            <li>
              <span className="footer-contacto__icon"><FaMapMarkerAlt size={14} /></span>
              <a href={DIRECCION.enlace} target="_blank" rel="noopener noreferrer">{DIRECCION.texto}</a>
            </li>
          </ul>
        </div>

        {/* Columnas de enlaces */}
        <div className="footer-columnas">
          {COLUMNAS.map((col) => (
            <div key={col.titulo} className="footer-col">
              <h3>{col.titulo}</h3>
              <ul>
                {col.enlaces.map((e) => (
                  <li key={e.texto}>
                    <Link to={e.to}>{e.texto}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Barra legal */}
      <div className="footer-base">
        <span>© {anioActual} Droguería Carrisán, C.A. Todos los derechos reservados.</span>
        <div className="footer-base__links">
          <Link to="/terminos">Términos</Link>
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/ayuda">Ayuda</Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
