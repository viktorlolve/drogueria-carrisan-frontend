import { Clock, Mail, MapPin, MessageCircle, MessageSquare, Phone, Zap } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import CONTACTO from '../config/contacto'
import './Contacto.css'

const { whatsapp, email, telefono, horario, direccion, tiempoRespuesta } = CONTACTO

const mailtoHref = `mailto:${email.texto}?subject=${encodeURIComponent(email.asunto)}&body=${encodeURIComponent(email.cuerpo)}`

function Contacto() {
  return (
    <div className="ct-page">
      {/* Hero */}
      <section className="ct-hero">
        <div className="ct-hero__contenido">
          <p className="ct-hero__eyebrow">Droguería Carrisán · Atención directa</p>
          <h1>¿Cómo prefieres escribirnos?</h1>
          <p className="ct-hero__texto">
            Elige el canal que prefieras y te respondemos directamente. Somos una empresa
            familiar: hay una persona esperándote detrás de cada mensaje.
          </p>
        </div>
      </section>

      <div className="ct-container">
        {/* Los dos canales de contacto */}
        <div className="ct-canales">
          <section className="ct-canal ct-canal--wa">
            <div className="ct-canal__cabecera">
              <span className="ct-canal__icono" aria-hidden="true">
                <FaWhatsapp size={26} />
              </span>
              <div>
                <span className="ct-canal__badge">Respuesta más rápida</span>
                <h2>Escríbenos por WhatsApp</h2>
              </div>
            </div>

            <p className="ct-canal__desc">{CONTACTO.whatsappDesc}</p>

            <a
              className="ct-canal__btn"
              href={whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp size={18} />
              Abrir WhatsApp
            </a>

            <p className="ct-canal__nota">{whatsapp.texto}</p>
          </section>

          <section className="ct-canal">
            <div className="ct-canal__cabecera">
              <span className="ct-canal__icono" aria-hidden="true">
                <Mail size={24} />
              </span>
              <div>
                <span className="ct-canal__badge">Cotizaciones y documentos</span>
                <h2>Envíanos un correo</h2>
              </div>
            </div>

            <p className="ct-canal__desc">{CONTACTO.emailDesc}</p>

            <a className="ct-canal__btn" href={mailtoHref}>
              <Mail size={18} />
              Escribir por correo
            </a>

            <p className="ct-canal__nota">{email.texto}</p>
          </section>
        </div>

        {/* Información de contacto */}
        <section>
          <h2 className="ct-info__titulo">Información de contacto</h2>

          <div className="ct-info">
            <div className="ct-info-card">
              <div className="ct-info-card__head">
                <span className="ct-info-card__icono" aria-hidden="true">
                  <Clock size={18} />
                </span>
                <h3>Horario de atención</h3>
              </div>

              <div className="ct-horario">
                {horario.map((fila) => (
                  <div
                    key={fila.dias}
                    className={`ct-horario__fila${fila.rango === 'Cerrado' ? ' ct-horario__fila--cerrado' : ''}`}
                  >
                    <span className="ct-horario__dias">{fila.dias}</span>
                    <span className="ct-horario__rango">{fila.rango}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ct-info-card">
              <div className="ct-info-card__head">
                <span className="ct-info-card__icono" aria-hidden="true">
                  <Phone size={18} />
                </span>
                <h3>Datos de contacto</h3>
              </div>

              <div className="ct-datos">
                <div className="ct-dato">
                  <Mail size={16} color="#0052DC" aria-hidden="true" />
                  <a className="ct-dato__texto" href={`mailto:${email.texto}`}>
                    {email.texto}
                  </a>
                </div>

                <div className="ct-dato">
                  <Phone size={16} color="#0052DC" aria-hidden="true" />
                  <a className="ct-dato__texto" href={`tel:${telefono.tel}`}>
                    {telefono.texto}
                  </a>
                </div>

                <div className="ct-dato">
                  <MessageCircle size={16} color="#25D366" aria-hidden="true" />
                  <a
                    className="ct-dato__texto"
                    href={whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            <div className="ct-info-card">
              <div className="ct-info-card__head">
                <span className="ct-info-card__icono" aria-hidden="true">
                  <MapPin size={18} />
                </span>
                <h3>Nuestra sede</h3>
              </div>

              <p className="ct-direccion">
                {direccion.linea1}
                <br />
                {direccion.linea2}
              </p>

              <a
                className="ct-mapa"
                href={direccion.mapa}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={15} />
                Ver en el mapa
              </a>
            </div>
          </div>
        </section>

        {/* Franja informativa */}
        <div className="ct-franja">
          <div className="ct-franja__item">
            <span className="ct-franja__icono" aria-hidden="true">
              <Zap size={17} />
            </span>
            <p className="ct-franja__texto">{tiempoRespuesta}</p>
          </div>

          <div className="ct-franja__item">
            <span className="ct-franja__icono" aria-hidden="true">
              <MessageSquare size={17} />
            </span>
            <p className="ct-franja__texto">
              <strong>Para una cotización más rápida</strong>, incluye en tu mensaje tu RIF o cédula,
              la lista de productos y las cantidades que necesitas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contacto
