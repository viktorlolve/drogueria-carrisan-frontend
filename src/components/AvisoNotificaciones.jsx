import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { usePush } from '../hooks/usePush'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import {
  CLAVE_AVISO,
  VALOR_NO_MOSTRAR,
  esDecisionNoMostrar,
  debeMostrarAviso,
} from './avisoNotificacionesHelpers'
import './AvisoNotificaciones.css'

// Aviso fijo inferior que invita a activar las notificaciones del navegador.
//
// Se monta SOLO en Mi Cuenta (la entrada natural a esta decisión) y aparece
// una vez que `usePush()` terminó de detectar el estado, para no parpadear ni
// mostrarse cuando no aporta (navegador sin push, ya activado, permiso
// bloqueado por el navegador, o el usuario ya eligió "Ahora no" acá).
//
// "Ahora no" recuerda la decisión en ESTE dispositivo (localStorage) y no
// vuelve a aparecer; en otro dispositivo se pregunta de nuevo. Activar más
// tarde desde el engranaje de Mi Cuenta sigue disponible.
export default function AvisoNotificaciones() {
  const { soportado, suscrito, permiso, pidiendoPermiso, activar } = usePush()
  const [visible, setVisible] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  // Decisión por dispositivo, leída una sola vez (inicializador de useState:
  // sin setState dentro de un efecto).
  const [dijoAhoraNo] = useState(() => esDecisionNoMostrar(safeGetItem(CLAVE_AVISO)))

  const debeMostrar = debeMostrarAviso({ soportado, suscrito, permiso, dijoAhoraNo })

  useEffect(() => {
    if (!debeMostrar) return
    // Pequeño delay para que la animación de entrada se note (mismo criterio
    // que la barra de cookies).
    const timer = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(timer)
  }, [debeMostrar])

  function cerrar() {
    setSaliendo(true)
    // Debe coincidir con la duración de la animación de salida en el CSS.
    setTimeout(() => setVisible(false), 350)
  }

  function handleAhoraNo() {
    safeSetItem(CLAVE_AVISO, VALOR_NO_MOSTRAR)
    cerrar()
  }

  async function handleActivar() {
    // `activar()` necesita un gesto del usuario: es este click.
    await activar()
    cerrar()
  }

  if (!visible) return null

  return (
    <div
      className={`aviso-notif ${saliendo ? 'aviso-notif--saliendo' : ''}`}
      role="region"
      aria-label="Activar notificaciones"
    >
      <div className="aviso-notif__icono" aria-hidden="true">
        <Bell size={22} />
      </div>

      <div className="aviso-notif__texto">
        <p className="aviso-notif__titulo">Activá las notificaciones</p>
        <p className="aviso-notif__descripcion">
          Enterate al instante cuando tu pedido avanza, te responden un mensaje o vence un pago.
        </p>
      </div>

      <div className="aviso-notif__acciones">
        <button
          type="button"
          className="aviso-notif__btn aviso-notif__btn--ahora-no"
          onClick={handleAhoraNo}
          disabled={pidiendoPermiso}
        >
          Ahora no
        </button>
        <button
          type="button"
          className="aviso-notif__btn aviso-notif__btn--activar"
          onClick={handleActivar}
          disabled={pidiendoPermiso}
        >
          {pidiendoPermiso ? 'Activando…' : 'Activar'}
        </button>
      </div>
    </div>
  )
}
