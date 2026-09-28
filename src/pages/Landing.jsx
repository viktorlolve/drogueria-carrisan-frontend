import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, ChevronDown, Star, HeartHandshake, Lock,
} from 'lucide-react'
import './Landing.css'
import InfoModal from '../components/InfoModal'
// Importaciones de los archivos de datos
import beneficios from '../data/beneficios'
import catalogoUnitarioIntegral from '../data/catalogoUnitarioIntegral'
import descuentoVolumenEscala from '../data/descuentoVolumenEscala'
import financiamiento from '../data/financiamiento'
import preciosDirectoDistribucion from '../data/preciosDirectoDistribucion'
import cadenaSuministrosSinInterrupciones from '../data/cadenaSuministrosSinInterrupciones'
import gestionUnaSolaCuentaEquipo from '../data/gestionUnaSolaCuentaEquipo'
import lineaHospitalariaInsumosQuirurgicos from '../data/lineaHospitalariaInsumosQuirurgicos'
import logisticaAgilMultiplesDirecciones from '../data/logisticaAgilMultiplesDirecciones'
import comoFuncionaLaPlataforma from '../data/comoFuncionaLaPlataforma'
import recaudosCuentaB2B from '../data/recaudosCuentaB2B'
import seguridadInformacion from '../data/seguridadInformacion'
import respaldoMedicoVenezolano from '../data/respaldoMedicoVenezolano'
import avisoNoDiscriminacion from '../data/avisoNoDiscriminacion'


  const BASE_URL = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'
  
const urls = {
    hero: `${BASE_URL}/hero.png`,
    financiamiento: `${BASE_URL}/financiamientocarrisan.png`,
    descuento: `${BASE_URL}/descuentoxvolumen.png`,
    precios: `${BASE_URL}/precioscompetitivos.png`,
    registrate: `${BASE_URL}/registrate.png`,
    pedidoenlinea: `${BASE_URL}/pedidoenlinea.png`,
    recibe: `${BASE_URL}/recibe.png`,
    cadena: `${BASE_URL}/cadena.png`,
    deliverydc: `${BASE_URL}/deliverydc.png`,
    encargada: `${BASE_URL}/encargada.png`,
    equipomedico: `${BASE_URL}/equipomedico.png`,
    victor: `${BASE_URL}/victor.png`,
    tratohecho: `${BASE_URL}/financiamiento.png`,
    lineahospitalariaa: `${BASE_URL}/lineahospitalariaa.png`,
    sacs: `${BASE_URL}/sacs.png`,
    farmapatria: `${BASE_URL}/farmapatria.gif`,
}


const ImagePlaceholder = ({ label, className }) => {
  return (
    <div className={className} style={{ 
      backgroundColor: '#e0e0e0', 
      padding: '40px', 
      textAlign: 'center',
      color: '#888'
    }}>
      {label || 'Imagen'}
    </div>
  )
}
 



function Carrusel({ items, renderItem, claseContenedor, claseTarjeta }) {
  const [activo, setActivo] = useState(0)
  const scrollRef = useRef(null)

  function manejarScroll() {
    const el = scrollRef.current
    if (!el) return
    const ancho = el.clientWidth
    const indice = Math.round(el.scrollLeft / ancho)
    setActivo(indice)
  }

  function irA(indice) {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: indice * el.clientWidth, behavior: 'smooth' })
    setActivo(indice)
  }

  return (
    <>
      <div
        ref={scrollRef}
        className={`landing-carrusel ${claseContenedor}`}
        onScroll={manejarScroll}
      >
        {items.map((item, i) => (
          <div key={i} className={`landing-carrusel__item ${claseTarjeta}`}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
      <div className="landing-carrusel__dots" role="tablist" aria-label="Paginación">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activo}
            aria-label={`Ir a la tarjeta ${i + 1}`}
            className={i === activo ? 'landing-carrusel__dot landing-carrusel__dot--activo' : 'landing-carrusel__dot'}
            onClick={() => irA(i)}
          />
        ))}
      </div>
    </>
  )
}

const BENEFICIOS = [
  'Catalogo Integral Unificado',
  'Línea de Crédito B2B',
  'Pedidos flexibles y sin mínimos exigentes',
]

const AHORROS = [
  {
    titulo: 'Descuento por Volumen y Escala',
    texto: 'Reduce tu costo por unidad al comprar por empaque cerrado o bulto. Mientras más consolides, mejor es tu margen.',
    link: 'Ver escalas de precio',
    imagen: urls.descuento,
    data: descuentoVolumenEscala,
  },
  {
    titulo: 'Financiamiento B2B a 7 Días',
    texto: 'Ahorra en costo de oportunidad: recibe tu inventario hoy, genera ingresos con tus pacientes y paga a los 7 días sin intereses.',
    link: 'Más información sobre el crédito',
    imagen: urls.financiamiento,
    data: financiamiento,
  }, 
  {
    titulo: 'Precios Directos de Distribución',
    texto: 'Sin intermediarios. Accede a precios especiales de origen y ofertas semanales en líneas comerciales y hospitalarias seleccionadas.',
    link: 'Ver ofertas del mes',
    imagen: urls.precios,
    data: preciosDirectoDistribucion,
  },
]

const PASOS = [
  {
    numero: 1,
    titulo: 'Crea tu Cuenta B2B',
    texto: 'Un proceso 100% gratuito y rápido. Vincula tu farmacia, clínica o consultorio para habilitar tus precios preferenciales de distribución.',
    imagen: urls.registrate,
    data: recaudosCuentaB2B,
  },
  {
    numero: 2,
    titulo: 'Arma tu Pedido en Tiempo Real',
    texto: 'Explora el catálogo comercial y hospitalario, consulta el inventario disponible al instante y genera tu orden a cualquier hora.',
    imagen: urls.pedidoenlinea,
    data: catalogoUnitarioIntegral,
  },
  {
    numero: 3,
    titulo: 'Recibe tus insumos',
    texto: 'Despachamos de forma prioritaria directo a tu establecimiento para que utilices tu mercancía y gestiones tu pago.',
    imagen: urls.recibe,
    data: logisticaAgilMultiplesDirecciones,
  },
]

const TESTIMONIOS = [
  { 
    texto: 'Consigo desde medicamentos de alta rotación hasta la línea hospitalaria para mi especialidad, ¡Consiguen de todo! y siempre con despacho puntual.', 
    autor: 'Dra. Marina A. — Medico Anestesiólogo' 
  },
  { 
    texto: 'Me olvide de estar dando vueltas buscando los insumos descartables, con ellos mantengo todo en orden y llevo mis cuentas al dia con los costos. ¡Unos Genios!.', 
    autor: 'Lic. Nathalie B. — Bioanalista' 
  },
  { 
    texto: 'Tienen los medicamentos que necesito para mis estudios y estan atentos siempre de tenerlos disponibles, una atencion personalizada fantastica.', 
    autor: 'Dr. Enrique B. — Medico Cardiólogo, Internista e Intensivista' 
  },
  { 
    texto: 'Mi proovedor de confianza, cumplen con mis requerimientos semi-urgentes y tengo la tranquilidad que todos los medicamentos son de calidad certificada.', 
    autor: 'Dr.  Ulises O. — Medico Anestesiólogo especialista en Terapia del Dolor' 
  },
  { 
    texto: 'Lo mas importante de nuestra labor es el tiempo, ya no me preocupo en buscar hasta debajo de las piedras, estos jovenes consiguen lo que necesito, siempre.', 
    autor: 'Dr. Egidio C. — Medico Especialista en Traumatología y Ortopedia' 
  },
  { 
    texto: 'Son mi primera opcion para ubicar lo que necesito, si no esta disponible igual tratan de conseguirlo, recomendados al 100%.', 
    autor: 'Dr. Leopoldo F. — Medico Internista especialista en ecodoppler vascular' 
  },
]

const MAS_EXPLORAR = [
  {
    titulo: 'Linea Hospitalaria',
    texto: 'Accede a un catálogo especializado en anestesia, fluidoterapia y material médico-quirúrgico para clínicas y centros médicos.',
    imagen: urls.lineahospitalariaa,
    data:  lineaHospitalariaInsumosQuirurgicos,
  },
  {
    titulo: 'Programa de Crédito B2B',
    texto: 'Obtén financiamiento a 7 días diseñado para respaldar el flujo de caja de pequeñas empresas.',
    imagen: urls.tratohecho,
    data: financiamiento,
  },
  {
    titulo: 'Gestion de Entregas personalizadas',
    texto: 'Atención prioritaria y logística ágil para reposición inmediata de insumos a distintas direcciones de la ciudad',
    imagen: urls.deliverydc,
    data: logisticaAgilMultiplesDirecciones,
  },
]

const FAQS = [
  {
    pregunta: '¿Qué requisitos necesito para abrir una cuenta B2B?',
    respuesta: 'Solo necesitas el RIF comercial, copia de la cédula del representante legal, y el registro o permiso sanitario correspondiente (SACS) para validar tu establecimiento.',
    data: recaudosCuentaB2B,
  },
  { 
    pregunta: '¿Cómo puedo consultar precios y disponibilidad de inventario?', 
    respuesta: 'Al iniciar sesión en nuestro portal, tendrás acceso inmediato a precios actualizados en tiempo real y tu orden sera confirmada con las cantidades disponibles en cuestion de minutos',
    data: catalogoUnitarioIntegral,
  },
  { 
    pregunta: '¿Cómo funciona el crédito a 7 días y quiénes aplican?', 
    respuesta: 'Es una facilidad otorgada a pequeñas farmacias, clínicas y centros quirurgicos. Te despachamos el pedido de inmediato y dispones de 7 días continuos para liquidar tu orden',
    data: financiamiento,
  },
  { 
    pregunta: '¿Existe un monto mínimo o volumen exigido para comprar?', 
    respuesta: 'No. Nos adaptamos a tu escala operativa real: puedes solicitar desde unidades o empaques individuales hasta bultos cerrados sin penalizaciones por volumen.',
    data: descuentoVolumenEscala,
  },
  { 
    pregunta: '¿A qué zonas despachan y cuáles son los tiempos de entrega?', 
    respuesta: 'Contamos con cobertura de despacho en Valencia y ciudades aledañas. Los despachos nacionales se envian entre 24 horas a la agencia de envios de su preferencia.',
    data: logisticaAgilMultiplesDirecciones,
  },
]


function FaqItem({ pregunta, respuesta, data }) {
  const [abierto, setAbierto] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  
  return (
    <div className="landing-faq__item">
      <button
        type="button"
        className="landing-faq__pregunta"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span>{pregunta}</span>
        <ChevronDown size={20} className={abierto ? 'landing-faq__chevron landing-faq__chevron--abierto' : 'landing-faq__chevron'} />
      </button>
      {abierto && respuesta && (
        <div className="landing-faq__respuesta">
          {respuesta}
          {data && (
            <button
              type="button"
              className="landing-link"
              onClick={() => setModalAbierto(true)}
            >
              Ver más información ›
            </button>
          )}
        </div>
      )}
      
      <InfoModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        data={data}
      />
    </div>
  )
}

function Landing() {
  const [modalInfo, setModalInfo] = useState(null)

  const abrirModal = (data) => {
    setModalInfo(data)
  }

  const cerrarModal = () => {
    setModalInfo(null)
  }

  return (
    <div className="landing">

      {/* ================================================================ */}
      {/* 1. HERO                                                          */}
      {/* ================================================================ */}
      <section className="landing-hero">
        <div className="landing-hero__contenido">
                <img src={urls.hero} alt="Hero" className="landing-hero__imagen" />
          
          <div className="landing-hero__texto">
            <h1>Respaldamos al Medico Venezolano</h1>
            <a href="/login" className="btn-landing btn-landing--primario">Iniciar Sesion | Crear Cuenta B2B</a>
            <p className="landing-hero__subtitulo">La plataforma digital de abastecimiento farmacéutico y hospitalario para clínicas, farmacias, centros quirúrgicos y medicos cirujanos.</p>
            
            <div className="landing-hero__acciones">
              <a href="#como-funciona" className="landing-link">¿Cómo funciona? ›</a>
              <a href="#" 
                 className="enlace-seguridad"
                 onClick={(e) => {
                   e.preventDefault()
                   abrirModal(seguridadInformacion)
                 }}
              >
                <Lock size={14} className="enlace-seguridad__icono" />
                <span className="enlace-seguridad__texto">
                  Tu información esta segura con nosotros. 
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. BENEFICIOS                                                    */}
      {/* ================================================================ */}
      <section className="landing-beneficios">
        <ul className="landing-beneficios__lista">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="landing-beneficios__item">
              
              <span className="landing-beneficios__icono">
                
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="landing-beneficios__texto">{beneficio}</span>
            </li>
          ))}
          
          
          <li className="landing-beneficios__item landing-beneficios__item--enlace">
            <a href="#" 
               className="landing-link"
               onClick={(e) => {
                 e.preventDefault()
                 abrirModal(beneficios)
               }}
            >Ver todos los beneficios +</a>
          </li>
        </ul>
      </section>

      {/* ================================================================ */}
      {/* 3. MÁS FORMAS DE GASTAR MENOS                                    */}
      {/* ================================================================ */}
      <section className="landing-ahorros">
        <h2>Más formas de optimizar tu presupuesto</h2>
        <p className="landing-ahorros__subtitulo">
          Diseñamos soluciones comerciales que protegen la rentabilidad de tu institución.
        </p>
        <div className="landing-ahorros__grid">
          {AHORROS.map((item) => (
              <div key={item.titulo} className="landing-ahorros__card">
                    <img 
                      src={item.imagen}
                      alt={item.titulo}
                      className="landing-ahorros__card-imagen"
                      loading="lazy"
                    />
              <div className="landing-ahorros__card-content">
          <h3 className="landing-ahorros__card-titulo">{item.titulo}</h3>
          <p className="landing-ahorros__card-texto">{item.texto}</p>
          <a href="#" 
             className="landing-link"
             onClick={(e) => {
               e.preventDefault()
               abrirModal(item.data)
             }}
          >{item.link} ›</a>
        </div>
        </div>
          ))}
        </div>
        <a href="#" 
           className="btn-landing btn-landing--outline landing-ahorros__cta"
           onClick={(e) => {
             e.preventDefault()
             abrirModal(descuentoVolumenEscala)
           }}
        >
          Explora nuestros descuentos
        </a>
      </section>

      {/* ================================================================ */}
      {/* 4. NORMATIVA Y FACTURACIÓN FISCAL                                */}
      {/* ================================================================ */}
      <section className="landing-seguros">
                    <img 
                      src={urls.encargada}
                      alt="Imagen Facturación y Permisos"
                      className="landing-seguros__imagen"
                      loading="lazy"
                    />
        <div className="landing-seguros__texto">
          <h2>Respaldo sanitario al día</h2>
          <p>Cumplimiento total de la normativa sanitaria venezolana, emisión de facturación clara adaptada a contribuyentes especiales y trazabilidad documentada en cada lote.</p>
          <a href="#" 
             className="btn-landing btn-landing--primario"
             onClick={(e) => {
               e.preventDefault()
               abrirModal(recaudosCuentaB2B)
             }}
          >Ver condiciones comerciales</a>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. LOGÍSTICA Y DESPACHOS PRIORITARIOS                            */}
      {/* ================================================================ */}
      <section className="landing-envios">
        <div className="landing-envios__texto">
          <h2>Cero interrupciones en tu cadena de suministro</h2>
          <p>Entregamos tus medicamentos e insumos quirúrgicos directamente en la puerta de tu clínica o farmacia, con tiempos de respuesta prioritarios para urgencias médicas.</p>
          <a href="#" 
             className="btn-landing btn-landing--primario"
             onClick={(e) => {
               e.preventDefault()
               abrirModal(cadenaSuministrosSinInterrupciones)
             }}
          >Ver condiciones para los envios</a>
          <a href="#" 
             className="landing-link"
             onClick={(e) => {
               e.preventDefault()
               abrirModal(logisticaAgilMultiplesDirecciones)
             }}
          >¿Necesitas un despacho rapido?</a>
        </div>
        <div>
        <div className="landing-envios__media">
                    <img 
                      src={urls.cadena}
                      alt="Imagen Despacho B2B"
                      className="landing-envios__imagen"
                      loading="lazy"
                    />
          
          <div className="landing-envios__notificacion">
            <Check size={16} className="landing-envios__notificacion-icono" />
            <div>
              <strong>Orden en ruta de entrega</strong>
              <span>Hoy a las 09:15 AM — Enviado</span>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. GESTIÓN MULTIUSUARIO CORPORATIVA                              */}
      {/* ================================================================ */}
      <section className="landing-ayuda-meds">
                    <img 
                      src={urls.equipomedico}
                      alt="Imagen Gestión Multiusuario"
                      className="landing-ayuda-meds__imagen"
                      loading="lazy"
                    />
        <div className="landing-ayuda-meds__texto">
          <span className="landing-badge">NUEVO B2B</span>
          <h2>Gestión en una sola cuenta para tu equipo medico</h2>
          <p>Permite que tu farmacéutico regente, jefe de compras o departamento de administración gestionen presupuestos, aprueben órdenes y descarguen reportes desde una misma cuenta corporativa.</p>
          <a href="#" 
             className="btn-landing btn-landing--primario"
             onClick={(e) => {
               e.preventDefault()
               abrirModal(gestionUnaSolaCuentaEquipo)
             }}
          >Configurar cuenta institucional</a>
          <div className="landing-ayuda-meds__nota">
            <HeartHandshake size={22} />
            <div>
              <strong>¿Gestionas una red de farmacias o grupo médico?</strong>
              <p>Consolida el abastecimiento de múltiples sedes con atención personalizada.
                <br /></p>
              
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 7. ESTAMOS AQUÍ PARA AYUDARTE                                    */}
      {/* ================================================================ */}
      <section className="landing-ayudarte">
        <div className="landing-ayudarte__texto">
          <h2>Asesoría técnica y respaldo comercial</h2>
          <p>Nuestro equipo cuenta con años de experiencia en el sector salud, siempre buscando verificar la calidad y trazabilidad de cada despacho.</p>
          <div className="landing-ayudarte__badges">
            <img src={urls.sacs} alt="sacs" className="landing-badge-img" />
            <img src={urls.farmapatria} alt="farmapatria" className="landing-badge-img" />
          </div>
        </div>
                    <img 
                      src={urls.victor}
                      alt="Imagen Atención Farmacéutica B2B"
                      className="landing-ayudarte__imagen"
                      loading="lazy"
                    />
      </section>

      
      {/* ================================================================ */}
      {/* 8. CÓMO FUNCIONA                                                 */}
      {/* ================================================================ */}
      <section id="como-funciona" className="landing-como-funciona">
        <h2>¿Cómo funciona nuestro portal?</h2>
        <a href="#" 
           className="landing-video-link"
           onClick={(e) => {
             e.preventDefault()
             abrirModal(comoFuncionaLaPlataforma)
           }}
        >
          Conoce la plataforma de Droguería Carrisan en 1 minuto
        </a>
        
        <Carrusel
          items={PASOS}
          claseContenedor="landing-como-funciona__grid"
          claseTarjeta="landing-como-funciona__card"
          renderItem={(paso) => (
            <>
              <img 
                src={paso.imagen}  
                alt={paso.titulo}  
                className="landing-como-funciona__imagen"  
                loading="lazy"
                onClick={() => abrirModal(paso.data)}
              />
              {/* Agregamos clases específicas para el título y el texto */}
              <h3 className="landing-como-funciona__titulo">{paso.numero}. {paso.titulo}</h3>
              <p className="landing-como-funciona__texto">{paso.texto}</p>
            </>
          )}
        />
  
  <a href="#" 
     className="btn-landing btn-landing--solido"
     onClick={(e) => {
       e.preventDefault()
       abrirModal(comoFuncionaLaPlataforma)
     }}
  >Conocer más sobre el proceso de compra</a>
</section>

      {/* ================================================================ */}
      {/* 9. OPINIONES DE CLIENTES                                         */}
      {/* ================================================================ */}
      <section className="landing-testimonios">
        <h2>Lo que dicen los médicos que confían en nosotros</h2>
        <Carrusel
          items={TESTIMONIOS}
          claseContenedor="landing-testimonios__grid"
          claseTarjeta="landing-testimonios__card"
          renderItem={(t) => (
            <>
              <div className="landing-testimonios__estrellas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="#12A594" color="#12A594" />
                ))}
              </div>
              <p>"{t.texto}"</p>
              <span>– {t.autor}</span>
            </>
          )}
        />
      </section>

      {/* ================================================================ */}
      {/* 10. MÁS POR EXPLORAR                                             */}
      {/* ================================================================ */}
      <section className="landing-explorar">
        <h2>Más soluciones para tu institución</h2>
        <p className="landing-explorar__subtitulo">Descubre todos los servicios diseñados para potenciar la operatividad de tu centro de salud o farmacia.</p>
        <div className="landing-explorar__grid">
          {MAS_EXPLORAR.map((item) => (
            <div key={item.titulo} className="landing-explorar__card">
              <img 
                src={item.imagen}  
                alt={item.titulo}  
                className="landing-explorar__card-imagen"  
                loading="lazy"
              />
              <div className="landing-explorar__card-texto">
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
                <a href="#" 
                   className="landing-link"
                   onClick={(e) => {
                     e.preventDefault()
                     abrirModal(item.data)
                   }}
                >Saber más ›</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* 11. PREGUNTAS FRECUENTES                                         */}
      {/* ================================================================ */}
      <section className="landing-faq">
        <h2>Preguntas frecuentes</h2>
        <div className="landing-faq__lista">
          {FAQS.map((faq) => (
            <FaqItem key={faq.pregunta} {...faq} />
          ))}
        </div>
        <p className="landing-faq__otras">
          ¿Tienes otras dudas sobre aperturas de cuenta o líneas de crédito? Visita nuestro <Link to="/ayuda" className="landing-link">Centro de Ayuda›</Link>
        </p>
      </section>

      {/* ================================================================ */}
      {/* 12. CTA FINAL                                                    */}
      {/* ================================================================ */}
      <section className="landing-cta-final">
        <h2>Abastece tu institución con la droguería que te respalda.</h2>
        <a href="/login" className="btn-landing btn-landing--primario">Crear Cuenta B2B</a>
        <a href="/registro" 
           style={{ color: '#ffffff', textDecoration: 'underline' }}
           onClick={(e) => {
             e.preventDefault()
             abrirModal(recaudosCuentaB2B)
           }}
        >¿Necesitas ayuda para completar tus recaudos?</a>
      </section>

{/* ================================================================== */}
{/* 13. FOOTER - ESTILO AMAZON                                         */}
{/* ================================================================== */}

<footer className="landing-footer">
  {/* PARTE SUPERIOR - FONDO BLANCO */}
  <div className="landing-footer__top">
    <div className="landing-footer__container">
      {/* CABECERA */}
      <div className="landing-footer__header">
        <div className="landing-footer__brand-area">
          <ImagePlaceholder
            label="Logo"
            className="landing-footer__logo"
          />
          <nav className="landing-footer__nav">
            <Link to="/">
              Inicio
            </Link>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                abrirModal(comoFuncionaLaPlataforma)
              }}
            >
              Cómo funciona
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                abrirModal(descuentoVolumenEscala)
              }}
            >
              Formas de ahorrar
            </a>
            <Link to="/ayuda">
              Ayuda
            </Link>
                    <span className="landing-footer__fax">
          Whatsapp: +58 (414) 5949532 
        </span>
          </nav>
        </div>
        {/* BADGES */}
        <div className="landing-footer__badges">
          <ImagePlaceholder
            label="Badge 1"
            className="landing-badge-img"
          />
          <ImagePlaceholder
            label="Badge 2"
            className="landing-badge-img"
          />
        </div>
        
      </div>
      {/* LÍNEA */}
      <div className="landing-footer__divider" />
      {/* INFORMACIÓN */}
      <div className="landing-footer__info">
        <p className="landing-footer__direccion">
          Av. Urdaneta (99) Qta. Mirabal,
          Local 04C, Valencia 2001, Carabobo, Venezuela
        </p>
        
              <a
          href="#"
          className="landing-footer__prescriber"
          onClick={(e) => {
            e.preventDefault()
            abrirModal(respaldoMedicoVenezolano)
          }}
        >
          Drogueria Carrisan respaldando la labor del Médico Venezolano 🇻🇪❤️
          <span>›</span>
        </a>
      </div>
      {/* DISCLAIMER */}
      <div className="landing-footer__legal">
        <p>
          Los nombres que aparecen en la fotografía son con fines ilustrativos.
        </p>
        <p>
          <strong>
            *LAS DROGUERIAS NO REALIZAN VENTA DIRECTA AL PÚBLICO.
          </strong>{" "}
          De conformidad con la normativa sanitaria vigente en la República
          Bolivariana de Venezuela, las droguerías son establecimientos
          destinados a la distribución y comercialización de medicamentos al
          mayor dentro de la cadena de suministro farmacéutico. Sus operaciones
          están dirigidas a establecimientos e instituciones legalmente
          autorizados para la adquisición y dispensación de medicamentos, tales
          como farmacias, clínicas, hospitales y demás instituciones
          dispensadoras de salud. No está permitida la dispensación o venta de
          medicamentos directamente al consumidor final desde una droguería.
          La dispensación al público corresponde a los establecimientos
          farmacéuticos autorizados, de acuerdo con las disposiciones legales y
          sanitarias aplicables.
        </p>
      </div>
    </div>
  </div>
  {/* VOLVER ARRIBA */}
  <button
    type="button"
    className="landing-footer__back-top"
    onClick={() => window.scrollTo({
      top: 0,
      behavior: "smooth"
    })}
  >
    Volver arriba
  </button>
  {/* PARTE INFERIOR OSCURA */}
  <div className="landing-footer__bottom">
    <div className="landing-footer__bottom-container">
      <nav className="landing-footer__bottom-nav">
        <Link to="/cuenta">
          Tu cuenta
        </Link>
        <Link to="/orders">
          Tus pedidos
        </Link>
        <Link to="/ayuda">
          Ayuda
        </Link>
        <span>
          ¿Ya eres cliente?{" "}
          <Link to="/login">
            Iniciar sesión
          </Link>
        </span>
      </nav>
      {/* LOGO INFERIOR */}
      <div className="landing-footer__bottom-logo">
        <ImagePlaceholder
          label="Logo inferior"
          className="landing-footer__bottom-logo-img"
        />
      </div>
      {/* ENLACES LEGALES */}
      <div className="landing-footer__legal-links">
        <Link to="/terminos">
          Términos de uso
        </Link>
        <Link to="/privacidad">
          Política de privacidad
        </Link>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            abrirModal(avisoNoDiscriminacion)
          }}
        >
          Aviso de no discriminación
        </a>
      </div>
      {/* COPYRIGHT */}
      <div className="landing-footer__copyright">
        © 2026 Drogueria Carrisan, C.A. · Todos los derechos reservados
      </div>
    </div>
  </div>
</footer>

      {/* Modal global */}
      <InfoModal
        abierto={modalInfo !== null}
        onCerrar={cerrarModal}
        data={modalInfo}
      />
    </div>
  )
}

export default Landing
