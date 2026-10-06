import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Switch } from '@chakra-ui/react'
import { AlertCircle, Bell, BellOff, Loader2 } from 'lucide-react'
import { usePush } from '../../hooks/usePush'
import api from '../../api/axios'
import { CATEGORIAS, CLAVES_PUSH } from '../../utils/notificacionesCatalogo'
import './PreferenciasNotificaciones.css'

// ---------------------------------------------------------------
// Preferencias de avisos push (vive en el centro de notificaciones).
//
// Controla ÚNICAMENTE lo que el servidor manda al navegador: se guarda
// en `notificacion_preferencias` (columnas `push_*`). Solo existen las
// 6 claves de CLAVES_PUSH — no inventar `push_documentos` /
// `push_solicitudes`, el PUT las ignora y el switch se revierte solo.
//
// El maestro del punto es `usePush` (suscripción del navegador). Si no
// hay soporte o el permiso está bloqueado, los switches por categoría se
// muestran deshabilitados.
//
// El FILTRO de la lista de notificaciones vive en el sidebar izquierdo
// del centro (`filtro` en Notificaciones.jsx): es una vista reversible,
// no persiste. Antes había acá una segunda lista ("Qué se ve en esta
// lista") que escondía categorías de forma permanente en localStorage y
// hacía desaparecer notificaciones sin aviso — se eliminó.
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

export default function PreferenciasNotificaciones() {
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
    <section className="notif-prefs" aria-label="Preferencias de avisos push">
      {/* El título vive en el trigger del acordeón (Notificaciones.jsx). */}

      {/* ---------- Maestro de avisos push ---------- */}
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

      {/* ---------- Qué avisos te llegan ---------- */}
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

      <p className="notif-prefs__pie">
        Tus datos y tu contraseña se cambian en{' '}
        <Link to="/cuenta" className="notif-prefs__enlace">Mi Cuenta</Link>.
      </p>
    </section>
  )
}