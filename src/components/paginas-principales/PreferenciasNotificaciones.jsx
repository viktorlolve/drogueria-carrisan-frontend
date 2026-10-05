import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Switch } from '@chakra-ui/react'
import {
  AlertCircle,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import { usePush } from '../../hooks/usePush'
import api from '../../api/axios'
import { CATEGORIAS, ORDEN_CATEGORIAS, CLAVES_PUSH } from '../../utils/notificacionesCatalogo'
import './PreferenciasNotificaciones.css'

// ---------------------------------------------------------------
// Preferencias de notificación (vive en el centro de notificaciones).
//
// Antes esto estaba escondido en un modal de "Mi Cuenta" y, además,
// pintaba UN switch por cada una de las 8 categorías — dos de las
// cuales (`documentos` y `solicitudes`) no existen como columnas push
// en el backend, así que esos dos toggles no persistían.
//
// SON DOS COSAS DISTINTAS, y por eso hay dos listas:
//
//  1. AVISOS PUSH (backend): qué te manda el servidor al navegador.
//     Se guardan en `notificacion_preferencias` (columnas `push_*`).
//     Solo existen las 6 claves de CLAVES_PUSH — no inventar
//     `push_documentos` / `push_solicitudes`, el PUT las ignora y el
//     switch se revierte solo.
//
//  2. FILTRO DE LA LISTA (localStorage): qué notificaciones se ven en
//     el centro. Acá sí aplica a las 8 categorías. NO cambia lo que te
//     llega al navegador, solo lo que aparece en la lista.
//
// El maestro del punto 1 es `usePush` (suscripción del navegador). Si
// no hay soporte o el permiso está bloqueado, los switches por
// categoría se muestran deshabilitados.
// ---------------------------------------------------------------

const PREFS_POR_DEFECTO = {
  push_activo: true,
  push_ordenes: true,
  push_pagos: true,
  push_chat: true,
  push_credito: true,
  push_sistema: true,
  push_ofertas: true,
}

export default function PreferenciasNotificaciones({ silenciadas = [], onToggleSilenciar }) {
  const { soportado, suscrito, permiso, pidiendoPermiso, error, activar, desactivar } = usePush()
  const [prefs, setPrefs] = useState(null)
  const [guardando, setGuardando] = useState('')

  const permisoBloqueado = permiso === 'denied'
  const noSePuedeActivar = !soportado || permisoBloqueado

  useEffect(() => {
    api.get('/notifications/preferences')
      .then(({ data }) => setPrefs(data))
      // Si el endpoint falla se usan los defaults: el maestro sigue
      // funcionando (es del navegador) y las categorías no se pierden
      // al guardar.
      .catch(() => setPrefs(PREFS_POR_DEFECTO))
  }, [])

  function handleTogglePush() {
    if (pidiendoPermiso || permisoBloqueado) return
    if (suscrito) desactivar()
    else activar()
  }

  async function handleToggleCategoria(campo) {
    if (!prefs) return
    const nuevo = !prefs[campo]
    setPrefs((prev) => ({ ...prev, [campo]: nuevo }))
    setGuardando(campo)
    try {
      await api.put('/notifications/preferences', { [campo]: nuevo })
    } catch {
      // Optimista: si el PUT falla se revierte el toggle.
      setPrefs((prev) => ({ ...prev, [campo]: !nuevo }))
    } finally {
      setGuardando('')
    }
  }

  const descripcionMaestro = !soportado
    ? 'Tu navegador no soporta notificaciones push'
    : permisoBloqueado
      ? 'Las notificaciones están bloqueadas en la configuración del navegador'
      : suscrito
        ? 'Recibís avisos push de tu cuenta'
        : 'Activá para recibir avisos importantes de tu cuenta'

  return (
    <section className="notif-prefs" aria-label="Preferencias de notificación">
      <div className="notif-prefs__header">
        <span className="notif-prefs__header-icono">
          <SlidersHorizontal size={16} />
        </span>
        <div>
          <h2 className="notif-prefs__titulo">Preferencias de notificación</h2>
          <p className="notif-prefs__subtitulo">
            Elegí qué avisos te llegan al navegador y cuáles se ven en esta lista.
          </p>
        </div>
      </div>

      {/* ---------- 1. Maestro de avisos push ---------- */}
      <div className="notif-prefs__fila notif-prefs__fila--maestro">
        <span className={`notif-prefs__icono ${suscrito ? 'notif-prefs__icono--blue' : 'notif-prefs__icono--gray'}`}>
          {suscrito ? <Bell size={17} /> : <BellOff size={17} />}
        </span>
        <div className="notif-prefs__texto">
          <span className="notif-prefs__fila-titulo">Avisos y notificaciones</span>
          <span className="notif-prefs__fila-descripcion">{descripcionMaestro}</span>
        </div>
        {pidiendoPermiso && <Loader2 size={15} className="notif-prefs__spinner" />}
        <Switch.Root
          checked={!!suscrito}
          disabled={noSePuedeActivar || pidiendoPermiso}
          size="md"
          onCheckedChange={handleTogglePush}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </div>

      {error && (
        <div className="notif-prefs__fila notif-prefs__fila--error">
          <AlertCircle size={15} />
          <span className="notif-prefs__fila-descripcion">{error}</span>
        </div>
      )}

      {/* ---------- 2. Qué avisos te llegan ---------- */}
      {suscrito && prefs && (
        <div className="notif-prefs__bloque">
          <h3 className="notif-prefs__bloque-titulo">Qué avisos te llegan</h3>
          <div className="notif-prefs__categorias">
            {CLAVES_PUSH.map((catId) => {
              const cat = CATEGORIAS[catId]
              const campo = `push_${catId}`
              const Icono = cat.icono
              return (
                <div className="notif-prefs__fila" key={campo}>
                  <span className={`notif-prefs__icono notif-prefs__icono--${cat.color}`}>
                    <Icono size={16} />
                  </span>
                  <div className="notif-prefs__texto">
                    <span className="notif-prefs__fila-titulo">{cat.nombre}</span>
                  </div>
                  {guardando === campo && <Loader2 size={14} className="notif-prefs__spinner" />}
                  <Switch.Root
                    checked={prefs[campo] !== false}
                    disabled={guardando === campo}
                    size="md"
                    onCheckedChange={() => handleToggleCategoria(campo)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!suscrito && !noSePuedeActivar && (
        <p className="notif-prefs__nota">Activá los avisos para poder elegir categoría por categoría.</p>
      )}

      {/* ---------- 3. Qué se ve en esta lista ---------- */}
      {onToggleSilenciar && (
        <div className="notif-prefs__bloque">
          <h3 className="notif-prefs__bloque-titulo">
            Qué se ve en esta lista
            <span className="notif-prefs__bloque-ayuda">
              Oculta de la lista sin dejar de recibirlos
            </span>
          </h3>
          <div className="notif-prefs__categorias">
            {ORDEN_CATEGORIAS.map((catId) => {
              const cat = CATEGORIAS[catId]
              const Icono = cat.icono
              const visible = !silenciadas.includes(catId)
              return (
                <div className="notif-prefs__fila" key={`silencio-${catId}`}>
                  <span className={`notif-prefs__icono notif-prefs__icono--${visible ? cat.color : 'gray'}`}>
                    <Icono size={16} />
                  </span>
                  <div className="notif-prefs__texto">
                    <span className="notif-prefs__fila-titulo">{cat.nombre}</span>
                  </div>
                  <Switch.Root
                    checked={visible}
                    size="md"
                    onCheckedChange={() => onToggleSilenciar(catId, visible)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                  <span className={`notif-prefs__estado ${visible ? '' : 'notif-prefs__estado--off'}`}>
                    {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="notif-prefs__pie">
        Tus datos y tu contraseña se cambian en{' '}
        <Link to="/cuenta" className="notif-prefs__enlace">Mi Cuenta</Link>.
      </p>
    </section>
  )
}