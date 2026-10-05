import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ClipboardList,
  Clock,
  FileBarChart,
  MapPin,
  Package,
  ShoppingCart,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { CONTACTO } from '../config/contacto'
import './AyudaComoUsar.css'

// ---------------------------------------------------------------
// /ayuda/como-usar — guía de uso de la plataforma, en un acordeón
// plano por secciones (mismo patrón que la lista de FAQ de Ayuda.jsx
// pero con clases propias `.acu-*`).
//
// Esta página es PÚBLICA (como `/ayuda` y `/contacto`): el item del
// nav vive dentro del layout de cliente, pero el contenido no pide
// sesión ni expone datos del usuario.
//
// OJO — el copy de esta página lo revisa el dueño: no inventes acá
// precios, plazos ni políticas que no estén en el código. Si cambia
// una regla (plazo de un documento, estado del pedido, forma de
// pago), se edita esta SECCIONES y nada más.
// ---------------------------------------------------------------

const SECCIONES = [
  {
    id: 'primer-ingreso',
    titulo: 'Primer ingreso',
    icono: User,
    resumen:
      'El registro público es solo para cuentas institucionales. Los perfiles profesional y honorífico se abren con un enlace de invitación que entrega la empresa.',
    pasos: [
      'Entra con tu correo y contraseña. Si tu empresa ya te creó la cuenta, usa el correo que registró.',
      'El registro público (/registro) es únicamente institucional: se pide el RIF y los datos de la institución.',
      'Los perfiles profesional y honorífico se registran por invitación (un enlace con token que entrega la empresa). Si necesitas uno, escríbenos.',
      'Desde tu cuenta puedes crear sub-usuarios: personas que entren con su propio correo y compren a nombre de tu institución (ver la última sección).',
    ],
  },
  {
    id: 'buscar-productos',
    titulo: 'Buscar productos',
    icono: Package,
    resumen:
      'El catálogo comercial exige sesión iniciada. El registro sanitario y el vademécum se consultan sin sesión, pero ahí no hay precios.',
    pasos: [
      'Abre el Catálogo: si no tienes sesión, la misma página te ofrece iniciar sesión y al entrar te devuelve al producto que estabas viendo.',
      'Filtra por línea, forma farmacéutica, laboratorio y grupo ATC (por ejemplo "todos los anestésicos" o "analgésicos").',
      'Usa el buscador del navbar para encontrar por nombre: también sirve para productos que todavía no tienen precio.',
      'Los productos sin precio se muestran como "Consultar precio": no se agregan al carrito, se piden por requerimiento.',
      'Cada ficha muestra el registro sanitario (SKU), el laboratorio y la composición (molécula) del producto.',
    ],
  },
  {
    id: 'hacer-pedido',
    titulo: 'Hacer un pedido',
    icono: ShoppingCart,
    resumen:
      'Agrega al carrito, elige la forma de entrega y sigue el avance. El estado del pedido y el estado del pago son dos cosas separadas.',
    pasos: [
      'Agrega al carrito las cantidades que necesitas y revisa el total antes de confirmar.',
      'Elige la entrega: retiro en la droguería, delivery en la dirección guardada o envío nacional por agencia.',
      'Al confirmar, el pedido queda como "Pedido recibido" y entra a revisión del almacén.',
      'Retiro: Preparando → Listo para retirar → Retirado. Delivery o envío nacional: Preparando → En camino (o Enviado por agencia) → Entregado.',
      'Cada cambio de estado te llega como notificación y queda anotado en el historial del pedido.',
    ],
  },
  {
    id: 'formas-de-pago',
    titulo: 'Formas de pago',
    icono: Wallet,
    resumen:
      'Puedes pagar de dos formas: al contado, reportando el pago para que lo verifiquen, o con el crédito de tu línea.',
    pasos: [
      'Contado: al confirmar el pedido reportas el pago con su referencia y monto desde la pantalla del pedido.',
      'Contado: el pago queda "reportado" hasta que el personal de contabilidad lo verifica; después pasa a "verificado".',
      'Crédito: si tienes línea de crédito disponible, la orden se autoriza al instante y el almacén la aprueba.',
      'Crédito: ves tu línea, tu deuda y los vencimientos en Estado de cuenta, y puedes solicitar ampliación de línea.',
      'Un pedido puede estar "En preparación" y aun así tener el pago pendiente: son estados distintos. Si tu crédito está bloqueado por mora, no se puede pagar con crédito.',
    ],
  },
  {
    id: 'estado-cuenta',
    titulo: 'Estado de cuenta',
    icono: FileBarChart,
    resumen:
      'Todo el resumen financiero de la cuenta en una sola pantalla: línea de crédito, pagos, facturas y reportes.',
    pasos: [
      'El resumen muestra línea de crédito, deuda actual, deuda vencida y saldo disponible.',
      'En Pagos ves cada reporte que hiciste y su estado: esperando, reportado, verificado o rechazado.',
      'En Facturas descargas los comprobantes que te emitieron, con su número y su fecha.',
      'En Reportesconsultas los movimientos consolidados del período que elijas.',
      'Si necesitas más crédito, usa la solicitud de ampliación y el personal de finanzas la responde.',
    ],
  },
  {
    id: 'solicitudes',
    titulo: 'Solicitudes: cotizaciones, requerimientos y documentos',
    icono: ClipboardList,
    resumen:
      'Tres trámites distintos que se gestionan en el mismo lugar, pero no se responden igual.',
    pasos: [
      'Cotización: pides precio de una lista de productos y el vendedor responde con el precio y su vigencia.',
      'Requerimiento: es la vía para los productos del catálogo que todavía no tienen precio (botones "Consultar precio" / "Solicitar precio").',
      'Cuando un requerimiento se responde con precio, el producto queda disponible para pedirlo con normalidad.',
      'Documentos: sube tu RIF o tu referencia comercial para validar la cuenta.',
      'Los documentos aprobados tienen una ventana de 72 horas para descargarse; si pasan las 72 h hay que pedirlos de nuevo.',
    ],
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones y avisos',
    icono: Bell,
    resumen:
      'El centro de notificaciones agrupa todo lo que te llega. Los avisos del navegador y la lista del centro son dos cosas distintas.',
    pasos: [
      'En el centro hay filtros por categoría: pedidos, pagos, chat, crédito, solicitudes, documentos, sistema y ofertas.',
      'Los avisos del navegador se configuran aparte, con 6 interruptores: pedidos, pagos, chat, crédito, sistema y ofertas.',
      '"Qué se ve en esta lista" tiene las 8 categorías y es un filtro de la página: oculta la categoría de la lista sin dejar de recibir los avisos.',
      'Los avisos de documentos y solicitudes llegan dentro de "Avisos del sistema", que no es una categoría aparte de configuración.',
      'Desde Mi Cuenta → Preferencias de notificación llegas a este mismo panel. El interruptor grande de ahí activa o desactiva los avisos del navegador.',
      'Si instalaste la app en el celular y no te suenan los avisos, revisa el permiso de notificaciones del navegador.',
    ],
  },
  {
    id: 'sub-usuarios',
    titulo: 'Sub-usuarios y direcciones',
    icono: Users,
    resumen:
      'Un sub-usuario es una persona que entra con su propio correo y compra a nombre de tu cuenta. Las direcciones son las del titular.',
    pasos: [
      'En Mi Cuenta → Sub-usuarios creas un acceso para alguien de tu equipo: nombre, correo y contraseña propia.',
      'Ese sub-usuario ve el catálogo y hace pedidos, pero las órdenes quedan a nombre de la cuenta titular.',
      'Las direcciones de envío se administran una sola vez, en la cuenta titular: el sub-usuario elige de esa lista al hacer el pedido.',
      'Si el sub-usuario cambia una dirección, el cambio queda en la cuenta titular para que lo revises.',
    ],
  },
]

export default function AyudaComoUsar() {
  const navigate = useNavigate()
  const [abiertas, setAbiertas] = useState([])

  const todas = SECCIONES.length
  const toggle = (id) => {
    setAbiertas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const alternarTodas = () => {
    setAbiertas(abiertas.length === SECCIONES.length ? [] : SECCIONES.map((s) => s.id))
  }

  return (
    <div className="acu-page">
      <header className="acu-header">
        <div className="pagina-titulo pagina-titulo--centro">
          <button
            type="button"
            className="pagina-volver pagina-volver--hero"
            onClick={() => navigate(-1)}
            aria-label="Volver atrás"
          >
            <ArrowLeft size={20} />
          </button>
          <h1>Cómo usar la plataforma</h1>
        </div>
        <p>
          Guía práctica de Droguería Carrisan: desde tu primer ingreso hasta el seguimiento de tus
          pedidos, pagos y solicitudes.
        </p>
        <div className="acu-header__acciones">
          <Link to="/ayuda" className="acu-btn acu-btn--primario">
            Ver preguntas frecuentes
          </Link>
          <button type="button" className="acu-btn" onClick={alternarTodas}>
            {abiertas.length === todas ? 'Cerrar todas' : 'Abrir todas'}
          </button>
        </div>
      </header>

      <nav className="acu-jump" aria-label="Ir a una sección">
        {SECCIONES.map((s) => {
          const Icono = s.icono
          return (
            <a key={s.id} href={`#${s.id}`} className="acu-jump__chip">
              <Icono size={14} />
              <span>{s.titulo}</span>
            </a>
          )
        })}
      </nav>

      <main className="acu-container">
        {SECCIONES.map((s) => {
          const Icono = s.icono
          const abierta = abiertas.includes(s.id)
          return (
            <section key={s.id} id={s.id} className={`acu-card ${abierta ? 'acu-card--abierta' : ''}`}>
              <button
                type="button"
                className="acu-card__head"
                onClick={() => toggle(s.id)}
                aria-expanded={abierta}
              >
                <span className="acu-card__icono">
                  <Icono size={18} />
                </span>
                <span className="acu-card__titulo">{s.titulo}</span>
                <ChevronDown
                  size={18}
                  className={`acu-card__chevron ${abierta ? 'acu-card__chevron--abierto' : ''}`}
                />
              </button>

              {abierta && (
                <div className="acu-card__body">
                  <p className="acu-card__resumen">{s.resumen}</p>
                  <ol className="acu-card__pasos">
                    {s.pasos.map((paso, i) => (
                      <li key={i} className="acu-card__paso">
                        <span className="acu-card__paso-num">{i + 1}</span>
                        <span>{paso}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )
        })}

        {/* ---------- Contacto ---------- */}
        <section className="acu-contacto">
          <h2 className="acu-contacto__titulo">¿Te faltó algo?</h2>
          <p className="acu-contacto__texto">
            Escríbenos y lo revisamos contigo. Atendemos por WhatsApp y correo en horario laboral.
          </p>
          <div className="acu-contacto__acciones">
            <a
              href={CONTACTO.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="acu-btn acu-btn--primario"
            >
              Escríbenos por WhatsApp
            </a>
            <a href={`mailto:${CONTACTO.email.texto}`} className="acu-btn">
              {CONTACTO.email.texto}
            </a>
          </div>
          <ul className="acu-contacto__datos">
            <li>
              <MapPin size={14} /> {CONTACTO.direccion.linea1} — {CONTACTO.direccion.linea2}
            </li>
            {CONTACTO.horario.map((h) => (
              <li key={h.dias}>
                <Clock size={14} /> {h.dias}: {h.rango}
              </li>
            ))}
          </ul>
          <p className="acu-contacto__nota">{CONTACTO.tiempoRespuesta}</p>
        </section>
      </main>
    </div>
  )
}