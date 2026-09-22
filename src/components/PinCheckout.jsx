import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import './PinCheckout.css'

// ---------------------------------------------------------------
// Paso opcional del checkout: "¿Quién hace este pedido?"
// Input tipo OTP bancario: 4 bloques individuales, autoavanza,
// soporta pegar el PIN completo y borrar con backspace.
//
// Uso en tu componente de Checkout:
//
//   const [subUsuarioId, setSubUsuarioId] = useState(null)
//
//   <PinCheckout
//     onResuelto={(id) => setSubUsuarioId(id)}   // id o null
//     onDisponibilidad={(hay) => setTieneSubUsuarios(hay)}
//   />
//
// Al confirmar la orden, mandas sub_usuario_id: subUsuarioId en el
// body de tu POST /ordenes existente. Si la cuenta no tiene
// sub-usuarios activos, el componente no renderiza nada.
// ---------------------------------------------------------------

const LARGO_PIN = 4

function InputPin({ onCompleto, deshabilitado, resetKey }) {
  const [digitos, setDigitos] = useState(Array(LARGO_PIN).fill(''))
  const refs = useRef([])
  const [prevResetKey, setPrevResetKey] = useState(resetKey)

  // Ajuste de estado en fase de render: al incrementar resetKey (PIN
  // incorrecto o cambio de usuario) se limpian los dígitos.
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
    const pinCompleto = nuevos.join('')
    if (pinCompleto.length === LARGO_PIN && !pinCompleto.includes('')) {
      onCompleto(pinCompleto)
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
    <div className="pc-bloques" onPaste={manejarPegado}>
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
          className="pc-bloque"
        />
      ))}
    </div>
  )
}

function PinCheckout({ onResuelto, onDisponibilidad }) {
  const [subUsuarios, setSubUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [resultado, setResultado] = useState(null) // { id, nombre } | null
  const [error, setError] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    api
      .get('/subusuarios')
      .then(({ data }) => {
        const activos = data.filter((s) => s.activo)
        setSubUsuarios(activos)
        onDisponibilidad?.(activos.length > 0)
        if (activos.length === 0) onResuelto?.(null)
      })
      .catch(() => onDisponibilidad?.(false))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verificarPin(pinCompleto) {
    setVerificando(true)
    setError('')
    try {
      const { data } = await api.post('/subusuarios/verificar', { pin: pinCompleto })
      setResultado(data)
      onResuelto?.(data.id)
    } catch {
      setError('PIN incorrecto')
      setResultado(null)
      onResuelto?.(null)
      setResetKey((k) => k + 1)
    } finally {
      setVerificando(false)
    }
  }

  function cambiar() {
    setResultado(null)
    setError('')
    setResetKey((k) => k + 1)
    onResuelto?.(null)
  }

  if (cargando || subUsuarios.length === 0) return null

  return (
    <div className="pc-caja">
      <p className="pc-titulo">¿Quién hace este pedido?</p>

      {resultado ? (
        <div className="pc-confirmado">
          <span className="pc-confirmado__nombre">✓ {resultado.nombre}</span>
          <button type="button" className="pc-cambiar" onClick={cambiar}>
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <InputPin
            resetKey={resetKey}
            onCompleto={verificarPin}
            deshabilitado={verificando}
          />
          {verificando && <p className="pc-verificando">Verificando...</p>}
        </>
      )}

      {error && <p className="pc-error">{error}</p>}
    </div>
  )
}

export default PinCheckout
