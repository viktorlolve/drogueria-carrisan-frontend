import { useMemo, useRef, useState } from 'react'
import { normalizarEstado } from '../../config/estadosOrden'
import './TableroSwipeOrdenes.css'

// ---------------------------------------------------------------
// Versión MOBILE del tablero: tabs por estado + lista vertical.
// Cada tarjeta se desliza a los costados para avanzar/retroceder
// de estado, en vez de drag-and-drop (que en touch compite con el
// scroll de la página). Mismo contrato de props y mismo endpoint
// atrás (onCambiarEstado) que TableroKanbanOrdenes.
//
// ORDER STATUS ≠ FULFILLMENT METHOD: el siguiente/anterior estado se
// calcula POR ORDEN según su tipo_envio (retiro vs delivery), no de
// forma global — una orden de retiro avanza a listo_para_retiro, una
// de delivery a enviado. Las transiciones inválidas las bloquea el
// backend igualmente.
//
// 'cancelado' no aparece acá por la misma razón que en desktop:
// no es un paso del flujo, vive en el modal de detalle.
// ---------------------------------------------------------------

const FLUJO_RETIRO = ['pedido_creado', 'preparando', 'listo_para_retiro', 'retirado']
const FLUJO_ENVIO = ['pedido_creado', 'preparando', 'enviado', 'entregado']

// Tabs del tablero: todos los estados de trabajo de ambas líneas.
const TAB_ESTADOS = ['pedido_creado', 'preparando', 'enviado', 'listo_para_retiro', 'entregado', 'retirado']
const UMBRAL_SWIPE = 90

const flujoDe = (orden) => (orden.tipo_envio === 'retiro' ? FLUJO_RETIRO : FLUJO_ENVIO)

function siguienteDe(orden, estado) {
  const flujo = flujoDe(orden)
  const i = flujo.indexOf(estado)
  return i >= 0 ? flujo[i + 1] : undefined
}

function anteriorDe(orden, estado) {
  const flujo = flujoDe(orden)
  const i = flujo.indexOf(estado)
  return i >= 0 ? flujo[i - 1] : undefined
}

function formatUSD(valor) {
  return `$${Number(valor || 0).toFixed(2)}`
}

function TarjetaOrdenSwipe({ orden, estadoColores, onCambiarEstado, onAbrir }) {
  const [dx, setDx] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const inicioX = useRef(0)

  const estadoSiguiente = siguienteDe(orden, orden.estado)
  const estadoAnterior = anteriorDe(orden, orden.estado)

  function handlePointerDown(e) {
    setArrastrando(true)
    inicioX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!arrastrando) return
    let delta = e.clientX - inicioX.current
    if (delta > 0 && !estadoSiguiente) delta = 0
    if (delta < 0 && !estadoAnterior) delta = 0
    setDx(delta)
  }

  function handlePointerUp() {
    if (!arrastrando) return
    setArrastrando(false)
    if (dx > UMBRAL_SWIPE && estadoSiguiente) onCambiarEstado(orden.id, estadoSiguiente)
    else if (dx < -UMBRAL_SWIPE && estadoAnterior) onCambiarEstado(orden.id, estadoAnterior)
    setDx(0)
  }

  const destino = dx > 0 ? estadoSiguiente : estadoAnterior
  const mostrarPista = Math.abs(dx) > 24 && destino

  return (
    <div className="swipe-fila">
      {mostrarPista && (
        <div
          className={`swipe-fila__pista ${dx > 0 ? 'swipe-fila__pista--derecha' : 'swipe-fila__pista--izquierda'}`}
          style={{ background: estadoColores[destino]?.color }}
        >
          {estadoColores[destino]?.label}
        </div>
      )}
      <div
        className="swipe-tarjeta"
        style={{
          transform: `translateX(${dx}px)`,
          transition: arrastrando ? 'none' : 'transform 0.2s ease',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => Math.abs(dx) < 4 && onAbrir(orden)}
      >
        <span className="swipe-tarjeta__id">#{orden.id}</span>
        <span className="swipe-tarjeta__cliente">{orden.users?.nombre || 'Cliente'}</span>
        <span className="swipe-tarjeta__total">{formatUSD(orden.total_usd)}</span>
      </div>
    </div>
  )
}

export default function TableroSwipeOrdenes({ ordenes, estadoColores, onCambiarEstado, onAbrirOrden }) {
  const [tabActiva, setTabActiva] = useState(TAB_ESTADOS[0])

  const conteoPorEstado = useMemo(() => {
    const mapa = {}
    TAB_ESTADOS.forEach((estado) => {
      mapa[estado] = ordenes.filter((o) => normalizarEstado(o.estado) === estado).length
    })
    return mapa
  }, [ordenes])

  const ordenesDeLaTab = useMemo(() => {
    return ordenes
      .filter((o) => normalizarEstado(o.estado) === tabActiva)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [ordenes, tabActiva])

  return (
    <div className="swipe-tablero">
      <div className="swipe-tabs">
        {TAB_ESTADOS.map((estado) => (
          <button
            key={estado}
            type="button"
            className={`swipe-tabs__item ${tabActiva === estado ? 'swipe-tabs__item--activa' : ''}`}
            onClick={() => setTabActiva(estado)}
          >
            <span className="swipe-tabs__punto" style={{ background: estadoColores[estado]?.color }} />
            {estadoColores[estado]?.label || estado}
            <span className="swipe-tabs__contador">{conteoPorEstado[estado]}</span>
          </button>
        ))}
      </div>

      <div className="swipe-lista">
        {ordenesDeLaTab.length === 0 ? (
          <p className="swipe-lista__vacio">Sin órdenes</p>
        ) : (
          ordenesDeLaTab.map((orden) => (
            <TarjetaOrdenSwipe
              key={orden.id}
              orden={orden}
              estadoColores={estadoColores}
              onCambiarEstado={onCambiarEstado}
              onAbrir={onAbrirOrden}
            />
          ))
        )}
      </div>
    </div>
  )
}