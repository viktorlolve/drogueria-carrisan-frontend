import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Privacidad.css'

// ---------------------------------------------------------
// Aviso de Privacidad — mismo patrón de diseño que /terminos
// (índice con anclas, secciones numeradas). El TEXTO es original,
// redactado para el negocio real de Droguería Carrisán, inspirado
// en las categorías típicas de un aviso de privacidad (qué se
// recopila, cómo se usa, con quién se comparte, tus opciones, etc.)
// pero sin copiar contenido de terceros.
//
// ⚠️ Borrador de referencia, no asesoría legal. Antes de publicarlo,
// hazlo revisar por un abogado en Venezuela.
// ---------------------------------------------------------
const INDICE = [
  { id: 'alcance', label: '1. Qué Cubre este Aviso' },
  { id: 'informacion-recopilada', label: '2. Qué Información Recopilamos' },
  { id: 'uso-informacion', label: '3. Cómo Usamos tu Información' },
  { id: 'como-recopilamos', label: '4. Cómo Recopilamos tu Información' },
  { id: 'con-quien-compartimos', label: '5. Con Quién Compartimos tu Información' },
  { id: 'preferencias', label: '6. Tus Opciones y Preferencias' },
  { id: 'acceso-actualizacion', label: '7. Acceder y Actualizar tu Información' },
  { id: 'seguridad', label: '8. Cómo Protegemos tu Información' },
  { id: 'retencion', label: '9. Cuánto Tiempo la Conservamos' },
  { id: 'menores', label: '10. Privacidad de Menores de Edad' },
  { id: 'terceros', label: '11. Enlaces a Servicios de Terceros' },
  { id: 'cookies', label: '12. Cookies y Tecnologías Similares' },
  { id: 'cambios', label: '13. Cambios a este Aviso' },
  { id: 'contacto', label: '14. Contacto' },
]

function IndiceLinks({ onNavigate }) {
  function handleClick(e, id) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (onNavigate) onNavigate()
  }

  return (
    <ul className="privacidad-indice__lista">
      {INDICE.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} onClick={(e) => handleClick(e, item.id)}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Privacidad() {
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="privacidad-page">
      <div className="privacidad-header">
        <button
          type="button"
          className="pagina-volver"
          onClick={() => navigate(-1)}
          aria-label="Volver atrás"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <h1>Aviso de Privacidad</h1>
        <p className="privacidad-header__fecha">Última actualización: 12 de agosto de 2026</p>
      </div>

      <div className="privacidad-aviso">
        <strong>Resumen:</strong> usamos tu información para gestionar tu cuenta, procesar tus
        pedidos y darte soporte comercial. No vendemos tu información a terceros. Podés pedirnos
        acceder, corregir o eliminar tus datos escribiéndonos a{' '}
        <a href="mailto:ventas@carrisan.com">ventas@carrisan.com</a>.
      </div>

      <button
        type="button"
        className="privacidad-indice__toggle privacidad-mobile-only"
        onClick={() => setIndiceAbierto((v) => !v)}
      >
        <span>Índice de contenidos</span>
        <svg
          className={indiceAbierto ? 'rotado' : ''}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {indiceAbierto && (
        <aside className="privacidad-indice privacidad-indice--mobile privacidad-mobile-only">
          <IndiceLinks onNavigate={() => setIndiceAbierto(false)} />
        </aside>
      )}

      <div className="privacidad-layout">
        <aside className="privacidad-indice privacidad-desktop-only">
          <p className="privacidad-indice__titulo">Índice</p>
          <IndiceLinks />
        </aside>

        <div className="privacidad-contenido">
          <section id="alcance" className="privacidad-seccion">
            <h2>1. Qué Cubre este Aviso</h2>
            <p>
              Este Aviso de Privacidad describe qué información personal recopila Droguería
              Carrisán ("<strong>nosotros</strong>", "<strong>Carrisán</strong>"), cómo la usamos,
              con quién la compartimos y qué opciones tenés al respecto. Aplica a la plataforma web
              y a cualquier aplicación asociada donde publiquemos este Aviso (el "<strong>Sitio</strong>").
            </p>
            <p>
              Este Aviso está dirigido a clientes comerciales (farmacias, distribuidores e
              instituciones de salud) que crean una cuenta o interactúan con nuestra plataforma. No
              cubre información recopilada fuera de línea salvo que se indique lo contrario.
            </p>
          </section>

          <section id="informacion-recopilada" className="privacidad-seccion">
            <h2>2. Qué Información Recopilamos</h2>
            <p>Según cómo uses la plataforma, podemos recopilar:</p>
            <ul className="privacidad-lista">
              <li><strong>Datos de identificación:</strong> nombre, razón social, RIF o cédula, teléfono, correo electrónico.</li>
              <li><strong>Datos de ubicación comercial:</strong> dirección fiscal y dirección(es) de entrega.</li>
              <li><strong>Datos de cuenta:</strong> credenciales de acceso, historial de sesiones, preferencias de la cuenta.</li>
              <li><strong>Datos comerciales:</strong> historial de pedidos, productos consultados o comprados, facturas, pagos y estado de tu Línea de Crédito.</li>
              <li><strong>Datos de pago:</strong> comprobantes de transferencia o pago móvil asociados a tus órdenes. No almacenamos datos completos de tarjetas bancarias.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, e interacciones básicas con el Sitio (páginas visitadas, productos buscados) para fines de funcionamiento y mejora.</li>
            </ul>
          </section>

          <section id="uso-informacion" className="privacidad-seccion">
            <h2>3. Cómo Usamos tu Información</h2>
            <p>Usamos tu información personal para:</p>
            <ul className="privacidad-lista">
              <li>Crear y administrar tu cuenta, y verificar tu identidad comercial.</li>
              <li>Procesar y dar seguimiento a tus pedidos, pagos y tu Línea de Crédito.</li>
              <li>Coordinar la entrega o retiro de tus pedidos.</li>
              <li>Darte soporte y responder tus consultas.</li>
              <li>Enviarte notificaciones operativas (estado de pedido, facturación, cambios en tu cuenta).</li>
              <li>Mejorar el catálogo, el rendimiento y la seguridad de la plataforma.</li>
              <li>Cumplir obligaciones legales o contables aplicables a nuestra actividad comercial.</li>
            </ul>
          </section>

          <section id="como-recopilamos" className="privacidad-seccion">
            <h2>4. Cómo Recopilamos tu Información</h2>
            <h3>A. Directamente de vos</h3>
            <p>
              Cuando creás una cuenta, completás tu perfil, realizás un pedido, cargás un
              comprobante de pago o nos escribís por soporte, nos proporcionás información
              directamente.
            </p>
            <h3>B. De forma automática</h3>
            <p>
              Al navegar el Sitio, recopilamos automáticamente datos técnicos básicos (como tu
              dirección IP o el tipo de dispositivo) necesarios para que la plataforma funcione
              correctamente y de forma segura.
            </p>
          </section>

          <section id="con-quien-compartimos" className="privacidad-seccion">
            <h2>5. Con Quién Compartimos tu Información</h2>
            <p>
              No vendemos ni alquilamos tu información personal a terceros con fines publicitarios.
              Podemos compartir tu información únicamente en estos casos:
            </p>
            <ul className="privacidad-lista">
              <li><strong>Proveedores de servicio:</strong> empresas que nos ayudan a operar la plataforma (por ejemplo, alojamiento web o procesamiento de base de datos), bajo obligación de confidencialidad.</li>
              <li><strong>Logística de entrega:</strong> cuando coordinamos el despacho de tu pedido, compartimos los datos necesarios para completar la entrega.</li>
              <li><strong>Requerimiento legal:</strong> cuando la ley o una autoridad competente lo exija.</li>
            </ul>
          </section>

          <section id="preferencias" className="privacidad-seccion">
            <h2>6. Tus Opciones y Preferencias</h2>
            <p>
              Podés elegir qué notificaciones recibir desde tu panel de cuenta. Las notificaciones
              operativas relacionadas con tus pedidos, pagos o tu Línea de Crédito son necesarias
              para el funcionamiento del servicio y no pueden desactivarse por completo mientras
              mantengas una cuenta activa.
            </p>
          </section>

          <section id="acceso-actualizacion" className="privacidad-seccion">
            <h2>7. Acceder y Actualizar tu Información</h2>
            <p>
              Podés actualizar tus datos de contacto, dirección de entrega y preferencias
              directamente desde tu cuenta. Para solicitar acceso, corrección o eliminación de otra
              información asociada a tu cuenta, escribinos a{' '}
              <a href="mailto:ventas@carrisan.com">ventas@carrisan.com</a>. Responderemos tu
              solicitud en un plazo razonable, salvo que exista una obligación legal o comercial que
              nos impida eliminar cierta información (por ejemplo, registros contables).
            </p>
          </section>

          <section id="seguridad" className="privacidad-seccion">
            <h2>8. Cómo Protegemos tu Información</h2>
            <p>
              Aplicamos medidas técnicas y administrativas razonables para proteger tu información
              (como contraseñas cifradas y acceso restringido a la base de datos). Ningún sistema es
              100% infalible; si detectamos un incidente de seguridad que afecte tus datos, te lo
              notificaremos conforme a lo requerido por la ley aplicable.
            </p>
          </section>

          <section id="retencion" className="privacidad-seccion">
            <h2>9. Cuánto Tiempo la Conservamos</h2>
            <p>
              Conservamos tu información mientras mantengas una cuenta activa con nosotros y durante
              el tiempo adicional necesario para cumplir obligaciones legales, contables o para
              resolver disputas. Si solicitás la eliminación de tu cuenta, conservaremos únicamente
              los registros que estemos legalmente obligados a mantener (por ejemplo, facturación).
            </p>
          </section>

          <section id="menores" className="privacidad-seccion">
            <h2>10. Privacidad de Menores de Edad</h2>
            <p>
              El Sitio está dirigido exclusivamente a clientes comerciales mayores de edad y no está
              diseñado para menores. No recopilamos intencionalmente información de menores de edad.
            </p>
          </section>

          <section id="terceros" className="privacidad-seccion">
            <h2>11. Enlaces a Servicios de Terceros</h2>
            <p>
              El Sitio puede incluir enlaces a servicios externos (por ejemplo, mapas o pasarelas de
              pago). No somos responsables de las prácticas de privacidad de esos servicios; te
              recomendamos revisar sus propias políticas.
            </p>
          </section>

          <section id="cookies" className="privacidad-seccion">
            <h2>12. Cookies y Tecnologías Similares</h2>
            <p>
              Usamos almacenamiento local del navegador (similar a cookies) para mantener tu sesión
              iniciada y recordar preferencias básicas, como búsquedas recientes. No usamos estas
              tecnologías con fines de publicidad de terceros.
            </p>
          </section>

          <section id="cambios" className="privacidad-seccion">
            <h2>13. Cambios a este Aviso</h2>
            <p>
              Podemos actualizar este Aviso de tiempo en tiempo. La fecha de "Última actualización"
              en la parte superior indica cuándo se hizo el cambio más reciente. El uso continuado de
              la plataforma tras una actualización implica tu aceptación del Aviso revisado.
            </p>
          </section>

          <section id="contacto" className="privacidad-seccion">
            <h2>14. Contacto</h2>
            <p>
              Si tenés preguntas sobre este Aviso de Privacidad o sobre cómo manejamos tu
              información, escribinos a{' '}
              <a href="mailto:ventas@carrisan.com">ventas@carrisan.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Privacidad