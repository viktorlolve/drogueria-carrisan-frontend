import { getConfigTipo } from '../../utils/notificacionesCatalogo'
import { formatFecha } from '../../utils/notificacionesUI'

// ---------------------------------------------------------------
// Tarjeta de una notificación. Compartida por el centro de
// notificaciones del cliente (`/notificaciones`) y el del staff
// (`/staff/notificaciones`).
//
// `clickable` por defecto = "hay `onClick`". El cliente pasa el suyo
// explícito porque hay tipos sin destino (no todas abren algo).
// El componente NO marca como leída: eso es de quien lista (el `PATCH`
// va con la sesión correcta: cliente o staff).
// ---------------------------------------------------------------

export default function TarjetaNotificacion({ notif, onClick, clickable }) {
  const config = getConfigTipo(notif.tipo)
  const Icono = config.icono
  const esClickeable = clickable ?? typeof onClick === 'function'

  return (
    <div
      className={`notif-card ${notif.leida ? '' : 'notif-card--no-leida'} ${esClickeable ? 'notif-card--clickeable' : ''}`}
      onClick={esClickeable ? () => onClick(notif) : undefined}
      role={esClickeable ? 'button' : undefined}
      tabIndex={esClickeable ? 0 : undefined}
      onKeyDown={
        esClickeable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(notif)
              }
            }
          : undefined
      }
    >
      <span className={`notif-icon notif-icon--${config.color}`}>
        <Icono size={17} />
      </span>
      <div className="notif-card__body">
        <div className="notif-card__top">
          <strong className="notif-card__titulo">{notif.titulo}</strong>
          <span className="notif-card__fecha">{formatFecha(notif.created_at)}</span>
        </div>
        <p className="notif-card__mensaje">{notif.mensaje}</p>
        {!notif.leida && <span className="notif-badge-nueva">Nueva</span>}
      </div>
    </div>
  )
}