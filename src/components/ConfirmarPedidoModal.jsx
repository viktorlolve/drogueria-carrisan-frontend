import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import './ConfirmarPedidoModal.css'

// ---------------------------------------------------------------
// Modal de confirmación de pedido. Reemplaza el flujo anterior donde
// el PIN vivía inline en el carrito y "Confirmar pedido" navegaba
// directo a /orders sin ninguna pausa. Ahora todo el cierre del
// checkout pasa por acá, en 3 pasos:
//
//   'pin'         → solo si la cuenta tiene sub-usuarios activos.
//                   Se muestra primero; el pedido no se crea hasta
//                   que el PIN es válido.
//   'procesando'  → mientras corre el POST /orders.
//   'exito'       → check animado + "tu orden está en Mis órdenes".
//
// El padre (Carrito.jsx) sigue siendo dueño del payload de la orden;
// este componente solo orquesta la UI y decide CUÁNDO se dispara el
// POST (nunca antes de tener un PIN válido, si aplica).
//
// onCerrarExito: se llama solo al cerrar el modal DESPUÉS del éxito
// (clic en "Ir al inicio" o la X) — ahí el padre limpia el carrito y
// navega. Cerrar en el paso 'pin' antes de tener éxito simplemente
// cancela, sin tocar el carrito.
// ---------------------------------------------------------------

const LARGO_PIN = 4

function InputPin({ onCompleto, deshabilitado, resetKey }) {
  const [digitos, setDigitos] = useState(Array(LARGO_PIN).fill(''))
  const refs = useRef([])
  const [prevResetKey, setPrevResetKey] = useState(resetKey)

  // Ajuste de estado en fase de render: al incrementar resetKey (PIN
  // incorrecto o reintento) se limpian los dígitos.
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setDigitos(Array(LARGO_PIN).fill(''))
  }

  useEffect(() => {
    refs.current[0]?.focus()
  }, [resetKey])

  function actualizar(index, valorCrudo) {
    const digito = valorCrudo.replace(/\D/g, '').slice(-1)
    const nuevos = [...digitos]
    nuevos[index] = digito
    setDigitos(nuevos)

    if (digito && index < LARGO_PIN - 1) {
      refs.current[index + 1]?.focus()
    }
    if (nuevos.every(d => d !== '') && nuevos.length === LARGO_PIN) {
      onCompleto(nuevos.join(''))
    }
  }

  function manejarTecla(index, e) {
    if (e.key === 'Backspace' && !digitos[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function manejarPegado(e) {
    e.preventDefault()
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LARGO_PIN)
    if (!pegado) return
    const nuevos = Array(LARGO_PIN).fill('')
    pegado.split('').forEach((d, i) => (nuevos[i] = d))
    setDigitos(nuevos)
    if (pegado.length === LARGO_PIN) {
      onCompleto(pegado)
      refs.current[LARGO_PIN - 1]?.focus()
    } else {
      refs.current[pegado.length]?.focus()
    }
  }

  return (
    <div className="cpm-bloques" onPaste={manejarPegado}>
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={deshabilitado}
          onChange={(e) => actualizar(i, e.target.value)}
          onKeyDown={(e) => manejarTecla(i, e)}
          className="cpm-bloque"
        />
      ))}
    </div>
  )
}

export default function ConfirmarPedidoModal({ requierePin, crearOrden, onCerrar, onCerrarExito }) {
  const [paso, setPaso] = useState(requierePin ? 'pin' : 'procesando')
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [nombreSubUsuario, setNombreSubUsuario] = useState('')
  const disparado = useRef(false)

  // Si no requiere PIN, disparamos la creación de la orden apenas se
  // monta el modal (una sola vez).
  useEffect(() => {
    if (!requierePin && !disparado.current) {
      disparado.current = true
      procesarOrden(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verificarPin(pinCompleto) {
    setVerificando(true)
    setError('')
    try {
      const { data } = await api.post('/subusuarios/verificar', { pin: pinCompleto })
      setNombreSubUsuario(data.nombre)
      await procesarOrden(data.id)
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos verificar el PIN')
      setResetKey((k) => k + 1)
      setVerificando(false)
    }
  }

  async function procesarOrden(subUsuarioId) {
    setPaso('procesando')
    setError('')
    try {
      await crearOrden(subUsuarioId)
      setPaso('exito')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al confirmar la orden')
      setPaso(requierePin ? 'pin' : 'error')
      setResetKey((k) => k + 1)
    } finally {
      setVerificando(false)
    }
  }

  function manejarCierre() {
    if (paso === 'exito') {
      onCerrarExito()
    } else {
      onCerrar()
    }
  }

  return (
    <div className="cpm-overlay" onClick={paso === 'procesando' ? undefined : manejarCierre}>
      <div className="cpm-content" onClick={(e) => e.stopPropagation()}>
        {paso !== 'procesando' && (
          <button type="button" className="cpm-close" onClick={manejarCierre} aria-label="Cerrar">
            ✕
          </button>
        )}

        {paso === 'pin' && (
          <>
            <p className="cpm-titulo">¿Quién hace este pedido?</p>
            <p className="cpm-subtitulo">Ingresa el PIN de 4 dígitos</p>
            <InputPin resetKey={resetKey} onCompleto={verificarPin} deshabilitado={verificando} />
            {verificando && <p className="cpm-verificando">Verificando...</p>}
            {error && <p className="cpm-error">{error}</p>}
          </>
        )}

        {paso === 'procesando' && (
          <div className="cpm-procesando">
            <div className="cpm-spinner" />
            <p className="cpm-procesando__texto">Confirmando tu pedido...</p>
          </div>
        )}

        {paso === 'error' && (
          <div className="cpm-procesando">
            <p className="cpm-error cpm-error--grande">{error}</p>
            <button type="button" className="cpm-btn-reintentar" onClick={() => procesarOrden(null)}>
              Reintentar
            </button>
          </div>
        )}

        {paso === 'exito' && (
          <div className="cpm-exito">
            <svg className="cpm-check" viewBox="0 0 52 52">
              <circle className="cpm-check__circulo" cx="26" cy="26" r="24" fill="none" />
              <path className="cpm-check__trazo" fill="none" d="M14 27l7 7 17-17" />
            </svg>
            <h2 className="cpm-exito__titulo">¡Pedido confirmado!</h2>
            <p className="cpm-exito__texto">
              {nombreSubUsuario ? `Registrado a nombre de ${nombreSubUsuario}. ` : ''}
              Ya puedes ver el estado de tu orden en <strong>Mis órdenes</strong>.
            </p>
            <button type="button" className="cpm-btn-inicio" onClick={onCerrarExito}>
              Ir al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
