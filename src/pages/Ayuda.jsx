import { useState } from 'react'
import { Link } from 'react-router-dom'
import InfoModal from '../components/InfoModal'
import ayudaData from '../data/ayudaData'
import { CONTACTO } from '../config/contacto'
import './Ayuda.css'

// ---------------------------------------------------------
// Íconos inline (SVG)
// ---------------------------------------------------------
const ICONOS = {
  pedido: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" />
    </svg>
  ),
  faq: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  ),
  cuenta: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  pagos: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  chevron: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  chevronAbajo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  externo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17 17 7" /><path d="M7 7h10v10" />
    </svg>
  ),
  catalogo: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  carrito: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  ),
  camion: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 3v5h-7z" /><circle cx="6" cy="19.5" r="1.6" /><circle cx="17.5" cy="19.5" r="1.6" />
    </svg>
  ),
  mail: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7 10-7" />
    </svg>
  ),
  lupa: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

// ---------------------------------------------------------
// Datos
// ---------------------------------------------------------
const categorias = [
  {
    id: 'pedido',
    titulo: 'Tu Pedido',
    icono: 'pedido',
    items: [
      { label: 'Rastrea Tu Pedido', slug: 'rastrear', desc: 'Consulta en tiempo real el estado de tu pedido.' },
      { label: 'Editar o Cancelar un Pedido', slug: 'editar-cancelar', desc: 'Modifica o cancela tu pedido antes del despacho.' },
      { label: 'Sustituciones de Productos', slug: 'sustituciones', desc: 'Qué pasa cuando un producto no está disponible.' },
      { label: 'Pedidos Cancelados', slug: 'cancelados', desc: 'Motivos comunes de cancelación y cómo proceder.' },
      { label: 'Pedidos Retrasados', slug: 'retrasados', desc: 'Qué hacer si tu pedido no llegó a tiempo.' },
      { label: 'Artículos Faltantes', slug: 'faltantes', desc: 'Reporta productos que no llegaron completos.' },
      { label: 'Pedido No Recibido', slug: 'no-recibido', desc: 'Qué hacer si tu pedido nunca llegó.' },
      { label: 'Volver a Pedir', slug: 'volver-a-pedir', desc: 'Repite un pedido anterior en un par de clics.' },
    ],
  },
  {
    id: 'faq',
    titulo: 'Preguntas Frecuentes',
    icono: 'faq',
    esFaq: true,
  },
  {
    id: 'cuenta',
    titulo: 'Tu Cuenta',
    icono: 'cuenta',
    items: [
      { label: 'Crear o Editar tu Cuenta', slug: 'crear-editar', desc: 'Actualiza tus datos comerciales y de entrega.' },
      { label: 'Recuperar Contraseña', slug: 'recuperar-contrasena', desc: 'Restablece tu acceso con tu RIF o cédula.' },
      { label: 'Estado de Cuenta y Línea de Crédito', slug: 'estado-de-cuenta', desc: 'Consulta tu saldo, facturas y crédito disponible.' },
    ],
  },
  {
    id: 'pagos',
    titulo: 'Pagos',
    icono: 'pagos',
    items: [
      { label: 'Métodos de Pago Aceptados', slug: 'metodos', desc: 'Transferencia bancaria y pago móvil.' },
      { label: 'Comprobantes y Facturas', slug: 'facturas', desc: 'Descarga o solicita tus comprobantes de pago.' },
      { label: 'Problemas con un Pago', slug: 'problemas', desc: 'Qué hacer si tu pago no fue reflejado.' },
    ],
  },
]

const preguntas = [
  { pregunta: '¿Cómo me registro en la plataforma?', respuesta: 'El registro es gestionado por nuestro equipo. Contáctanos a ventas@carrisan.com y te crearemos una cuenta con los precios según tu perfil comercial.' },
  { pregunta: '¿Cómo realizo un pedido?', respuesta: 'Navega por el catálogo, agrega productos al carrito, revisa tu orden y confírmala. Recibirás una notificación con el número de orden.' },
  { pregunta: '¿Cuáles son los tiempos de entrega?', respuesta: 'El despacho se coordina directamente con cada cliente. Los tiempos varían según ubicación y disponibilidad de productos.' },
  { pregunta: '¿Qué métodos de pago aceptan?', respuesta: 'Trabajamos con transferencia bancaria y pago móvil. Los detalles de pago se envían al confirmar la orden.' },
  { pregunta: '¿Puedo ver mis precios personalizados?', respuesta: 'Sí. Al iniciar sesión, el catálogo muestra los precios según tu etiqueta (mayorista, distribuidor, etc.). También puedes consultar tu estado de cuenta.' },
  { pregunta: '¿Cómo sé si mi orden fue procesada?', respuesta: 'Puedes ver el estado de tus órdenes en "Mis Órdenes". También recibirás notificaciones cuando el estado cambie.' },
  { pregunta: '¿Tienen política de devolución?', respuesta: 'Sí. Las devoluciones aplican por productos vencidos o defectuosos. Debes notificarlo dentro de las 48 horas posteriores a la entrega.' },
]

const pasos = [
  { icono: 'catalogo', titulo: 'Arma tu pedido desde el catálogo', desc: 'Elige tus productos y agrégalos al carrito con tus precios de siempre.' },
  { icono: 'carrito', titulo: 'Confirmamos disponibilidad y precio', desc: 'Revisamos tu orden y te avisamos si algo cambia antes de despacharla.' },
  { icono: 'camion', titulo: 'Coordinamos la entrega contigo', desc: 'Te contactamos para acordar fecha, lugar y forma de pago.' },
]

const necesidades = [
  { titulo: 'Catálogo completo', desc: 'Explora todas nuestras líneas de farmacia y hospitalaria.', to: '/catalogo', boton: 'Ver catálogo' },
  { titulo: 'Estado de cuenta', desc: 'Revisa tus facturas, pagos y línea de crédito disponible.', to: '/estado-cuenta', boton: 'Ver estado de cuenta' },
  { titulo: 'Línea Hospitalaria', desc: 'Insumos y productos para instituciones de salud.', to: '/hospitalaria', boton: 'Ver línea' },
  { titulo: 'Mis Órdenes', desc: 'Consulta el historial y estado de tus pedidos.', to: '/orders', boton: 'Ver mis órdenes' },
]

const enlacesUtiles = [
  { label: 'Escríbenos por correo', desc: '¿Necesitas ayuda? Estamos aquí para ayudarte.', href: 'mailto:ventas@carrisan.com', externo: true, icono: 'mail' },
  { label: 'Ver catálogo completo', desc: 'Todos nuestros productos, marcas y ofertas.', to: '/catalogo', icono: 'catalogo' },
  { label: '¿Quiénes somos?', desc: 'Conoce más sobre Droguería Carrisán.', to: '/quienes-somos', icono: 'faq' },
]

// ---------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------
function FaqAcordeon({ lista = preguntas }) {
  const [abierta, setAbierta] = useState(null)
  return (
    <div className="ayuda-lista">
      {lista.map((item, index) => (
        <div key={index} className="ayuda-fila ayuda-fila--faq">
          <button
            type="button"
            className="ayuda-fila__boton"
            onClick={() => setAbierta(abierta === index ? null : index)}
          >
            <span className="ayuda-fila__texto">
              <span className="ayuda-fila__titulo">{item.pregunta}</span>
              {abierta === index && <span className="ayuda-fila__desc">{item.respuesta}</span>}
            </span>
            <span className={`ayuda-fila__chevron ${abierta === index ? 'ayuda-fila__chevron--abierto' : ''}`}>
              {ICONOS.chevronAbajo}
            </span>
          </button>
        </div>
      ))}
    </div>
  )
}

function CategoriaPill({ categoria, activa, onClick }) {
  return (
    <button
      type="button"
      className={`ayuda-pill ${activa ? 'ayuda-pill--activa' : ''}`}
      onClick={onClick}
    >
      <span className="ayuda-pill__icono">{ICONOS[categoria.icono]}</span>
      <span className="ayuda-pill__label">{categoria.titulo}</span>
    </button>
  )
}

function ImagenPlaceholder({ alto = 220, texto = 'Imagen próximamente' }) {
  return (
    <div className="ayuda-imagen-placeholder" style={{ height: alto }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span>{texto}</span>
    </div>
  )
}

// ---------------------------------------------------------
// Página principal
// ---------------------------------------------------------
function Ayuda() {
  const [modalKey, setModalKey] = useState(null)
  const [categoriaActiva, setCategoriaActiva] = useState('faq')
  const [busqueda, setBusqueda] = useState('')

  const categoria = categorias.find((c) => c.id === categoriaActiva)

  // Filtrado de preguntas frecuentes e items según el texto escrito
  const preguntasFiltradas = preguntas.filter(
    (p) =>
      p.pregunta.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.respuesta.toLowerCase().includes(busqueda.toLowerCase())
  )

  const itemsFiltrados = categorias
    .flatMap((c) => c.items || [])
    .filter(
      (item) =>
        item.label.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.desc.toLowerCase().includes(busqueda.toLowerCase())
    )

  return (
    <div className="ayuda-page">
      {/* Header azul con título */}
      <div className="ayuda-header">
        <h1>Centro de Ayuda</h1>
        <p>¿En qué podemos ayudarte hoy?</p>

        {/* Buscador Integrado */}
        <div className="ayuda-search-box">
          <input
            type="text"
            className="ayuda-search-box__input"
            placeholder="Buscar por tema, palabra clave o pregunta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="button" className="ayuda-search-box__btn" aria-label="Buscar">
            {ICONOS.lupa}
          </button>
        </div>
      </div>

      {/* Pills de categoría — scroll horizontal en mobile */}
      {!busqueda && (
        <div className="ayuda-pills">
          {categorias.map((c) => (
            <CategoriaPill
              key={c.id}
              categoria={c}
              activa={categoriaActiva === c.id}
              onClick={() => setCategoriaActiva(c.id)}
            />
          ))}
        </div>
      )}

      <div className="ayuda-container">
        {/* Vista si el usuario está buscando algo */}
        {busqueda.trim() !== '' ? (
          <section className="ayuda-card">
            <h2 className="ayuda-card__titulo">Resultados para "{busqueda}"</h2>
            {preguntasFiltradas.length === 0 && itemsFiltrados.length === 0 ? (
              <p className="ayuda-sin-resultados">
                No encontramos temas relacionados. Escríbenos directamente a ventas@carrisan.com.
              </p>
            ) : (
              <>
                {preguntasFiltradas.length > 0 && (
                  <div className="ayuda-busqueda-bloque">
                    <h3>Preguntas Frecuentes</h3>
                    <FaqAcordeon lista={preguntasFiltradas} />
                  </div>
                )}
                {itemsFiltrados.length > 0 && (
                  <div className="ayuda-busqueda-bloque">
                    <h3>Artículos y Guías</h3>
                    <div className="ayuda-lista">
                      {itemsFiltrados.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          className="ayuda-fila"
                          onClick={() => {
                            const cat = categorias.find((c) => c.items?.some((it) => it.slug === item.slug))
                            setModalKey(`${cat.id}/${item.slug}`)
                          }}
                        >
                          <span className="ayuda-fila__icono-circulo">{ICONOS.pedido}</span>
                          <span className="ayuda-fila__texto">
                            <span className="ayuda-fila__titulo">{item.label}</span>
                            <span className="ayuda-fila__desc">{item.desc}</span>
                          </span>
                          <span className="ayuda-fila__chevron">{ICONOS.chevron}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          /* Card de la categoría activa */
          <section className="ayuda-card">
            <h2 className="ayuda-card__titulo">
              {categoria.esFaq ? 'Preguntas frecuentes' : `¿Cómo podemos ayudarte con ${categoria.titulo.toLowerCase()}?`}
            </h2>

            {categoria.esFaq ? (
              <FaqAcordeon />
            ) : (
              <div className="ayuda-lista">
                {categoria.items.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    className="ayuda-fila"
                    onClick={() => setModalKey(`${categoria.id}/${item.slug}`)}
                  >
                    <span className="ayuda-fila__icono-circulo">{ICONOS[categoria.icono]}</span>
                    <span className="ayuda-fila__texto">
                      <span className="ayuda-fila__titulo">{item.label}</span>
                      <span className="ayuda-fila__desc">{item.desc}</span>
                    </span>
                    <span className="ayuda-fila__chevron">{ICONOS.chevron}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Banner de imagen — placeholder a reemplazar */}
        <ImagenPlaceholder texto="Foto de equipo / bodega Carrisán" />

        {/* Bloque de texto grande */}
        <section className="ayuda-texto-grande">
          <h2>Estamos para ayudarte, siempre</h2>
          <p>Nuestro equipo responde tus dudas sobre pedidos, pagos y cuenta el mismo día hábil.</p>
        </section>

        {/* Pasos: cómo funciona un pedido */}
        <section className="ayuda-pasos">
          {pasos.map((paso, i) => (
            <div key={i} className="ayuda-paso">
              <span className="ayuda-paso__icono">{ICONOS[paso.icono]}</span>
              <div>
                <h3>{paso.titulo}</h3>
                <p>{paso.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* "Para todas tus necesidades" — carrusel horizontal / tarjetas */}
        <section className="ayuda-necesidades">
          <h2>Para todas tus necesidades</h2>
          <div className="ayuda-necesidades__fila">
            {necesidades.map((n) => (
              <div key={n.to} className="ayuda-necesidad-card">
                <ImagenPlaceholder alto={130} texto={n.titulo} />
                <h3>{n.titulo}</h3>
                <p>{n.desc}</p>
                <Link to={n.to} className="ayuda-necesidad-card__boton">{n.boton}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* Enlaces útiles */}
        <section className="ayuda-card">
          <h2 className="ayuda-card__titulo">Enlaces Útiles</h2>
          <div className="ayuda-lista">
            {enlacesUtiles.map((enlace) =>
              enlace.externo ? (
                <a key={enlace.label} href={enlace.href} className="ayuda-fila">
                  <span className="ayuda-fila__icono-circulo">{ICONOS[enlace.icono]}</span>
                  <span className="ayuda-fila__texto">
                    <span className="ayuda-fila__titulo">{enlace.label}</span>
                    <span className="ayuda-fila__desc">{enlace.desc}</span>
                  </span>
                  <span className="ayuda-fila__chevron">{ICONOS.externo}</span>
                </a>
              ) : (
                <Link key={enlace.label} to={enlace.to} className="ayuda-fila">
                  <span className="ayuda-fila__icono-circulo">{ICONOS[enlace.icono]}</span>
                  <span className="ayuda-fila__texto">
                    <span className="ayuda-fila__titulo">{enlace.label}</span>
                    <span className="ayuda-fila__desc">{enlace.desc}</span>
                  </span>
                  <span className="ayuda-fila__chevron">{ICONOS.chevron}</span>
                </Link>
              )
            )}
          </div>
        </section>

        {/* Banner de contacto final — mismo patrón que Ayuda */}
        <div className="faq-banner">
          <h2 className="faq-banner__titulo">¿No encontraste tu respuesta?</h2>
          <div className="faq-banner__acciones">
            <a
              href={CONTACTO.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="faq-banner__cta"
            >
              Escríbenos por WhatsApp
            </a>
            <a href={`mailto:${CONTACTO.email.texto}`} className="faq-banner__cta faq-banner__cta--secundario">
              O escríbenos un correo
            </a>
          </div>
        </div>
      </div>

      <InfoModal
        abierto={modalKey !== null}
        onCerrar={() => setModalKey(null)}
        data={modalKey ? ayudaData[modalKey] : null}
      />
    </div>
  )
}

export default Ayuda