import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import financiamientoInfo, { UMBRALES_AMPLIACION } from '../data/financiamiento'
import { formatearUSD } from '../utils/formato'
// Base visual compartida con el resto del estado de cuenta (clases ecb-*)
import './AmpliacionEstadoCuenta.css'

// ---------------------------------------------------------------
// Ampliación de línea de crédito — estilo banca en línea.
//
// Reglas que se respetan tal cual (no cambiar sin avisar):
//  · "Sin órdenes vencidas" es solo INFORMATIVO: el backend no bloquea la
//    elegibilidad ni la solicitud si hay vencidas, y esta pantalla tampoco.
//  · La ampliación se aplica al instante, sin aprobación manual
//    (ver financiamiento.js). Por eso ahora hay un paso de confirmación
//    antes de enviar la solicitud: antes un solo toque cambiaba la línea.
//
// UMBRALES_AMPLIACION es copia de la lógica del backend (estadocuenta.controller.js).
// ---------------------------------------------------------------

const CLAVE_OCULTAR = 'ec_ocultar_saldos'
const MASCARA = '••••••'

// Cifra "bancaria": moneda y decimales pequeños, enteros grandes
function Cifra({ valor, oculto = false, className = '' }) {
  if (oculto) {
    return (
      <span className={`ecb-cifra ${className}`}>
        <small className="ecb-cifra__moneda">USD</small>
        {MASCARA}
      </span>
    )
  }
  const [entero, decimales] = Math.abs(Number(valor || 0)).toFixed(2).split('.')
  return (
    <span className={`ecb-cifra ${className}`}>
      <small className="ecb-cifra__moneda">USD</small>
      {Number(entero).toLocaleString('en-US')}
      <small className="ecb-cifra__dec">.{decimales}</small>
    </span>
  )
}

// Bloquea el scroll del fondo y cierra con Escape mientras un modal está abierto
function useModal(onEscape) {
  const escapeRef = useRef(onEscape)
  useEffect(() => {
    escapeRef.current = onEscape
  })

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') escapeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previo
      document.removeEventListener('keydown', onKey)
    }
  }, [])
}

function ConfirmarAmpliacion({ elegibilidad, solicitando, error, onCancelar, onConfirmar }) {
  const uid = useId()
  useModal(() => { if (!solicitando) onCancelar() })
  const aumento = Number(elegibilidad.nueva_linea) - Number(elegibilidad.linea_actual)

  return createPortal(
    <div className="eca-portal">
      <div className="eca-overlay" onClick={() => { if (!solicitando) onCancelar() }}>
        <div
          className="eca-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-t`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="eca-modal__cerrar"
            onClick={onCancelar}
            disabled={solicitando}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          <span className="eca-modal__icono"><TrendingUp size={26} /></span>
          <h2 id={`${uid}-t`} className="eca-modal__titulo">Confirmar ampliación</h2>
          <p className="eca-modal__texto">
            Vas a ampliar tu línea de crédito un <strong>{elegibilidad.porcentaje_disponible}%</strong>.
            Se aplica al instante, sin aprobación manual.
          </p>

          <div className="eca-comparacion">
            <div>
              <span>Línea actual</span>
              <strong>{formatearUSD(elegibilidad.linea_actual)}</strong>
            </div>
            <ArrowRight size={18} className="eca-comparacion__flecha" aria-hidden="true" />
            <div>
              <span>Línea nueva</span>
              <strong className="eca-comparacion__nueva">{formatearUSD(elegibilidad.nueva_linea)}</strong>
            </div>
          </div>
          <p className="eca-modal__aumento">Aumento de {formatearUSD(aumento)}</p>

          {error && (
            <p className="eca-modal__error" role="alert">
              <AlertCircle size={16} /> {error}
            </p>
          )}

          <div className="eca-modal__acciones">
            <button type="button" className="eca-btn eca-btn--secundario" onClick={onCancelar} disabled={solicitando}>
              Cancelar
            </button>
            <button type="button" className="eca-btn eca-btn--primario" onClick={onConfirmar} disabled={solicitando}>
              {solicitando ? (<><Loader2 size={16} className="ecb-giro" /> Procesando…</>) : 'Confirmar ampliación'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ResultadoAprobado({ resultado }) {
  const aumento = Number(resultado.linea_nueva) - Number(resultado.linea_anterior)
  return (
    <div className="eca-resultado">
      <svg className="eca-resultado__check" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="eca-resultado__circulo" cx="26" cy="26" r="24" fill="none" />
        <path className="eca-resultado__tilde" fill="none" d="M15 27l8 8 14-16" />
      </svg>
      <h2>¡Ampliación aprobada!</h2>
      <p className="eca-resultado__texto">Tu nueva línea de crédito es</p>
      <Cifra valor={resultado.linea_nueva} className="eca-resultado__cifra" />
      <p className="eca-resultado__detalle">
        +{resultado.porcentaje_aplicado}% sobre {formatearUSD(resultado.linea_anterior)} · aumento de {formatearUSD(aumento)}
      </p>
      <Link to="/estado-de-cuenta" className="eca-btn eca-btn--primario eca-resultado__cta">
        Volver a mi estado de cuenta
      </Link>
    </div>
  )
}

export default function AmpliacionEstadoCuenta() {
  const { user } = useAuth()
  const [elegibilidad, setElegibilidad] = useState(null)
  const [resumenCuenta, setResumenCuenta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [ocultar, setOcultar] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OCULTAR) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data } = await api.get(`/clientes/${user.id}/estado-cuenta/ampliacion-elegibilidad`)
        if (!cancelado) setElegibilidad(data)
      } catch (err) {
        console.error(err)
        if (!cancelado) setErrorCarga(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    // Dato no crítico (solo para el requisito "sin órdenes vencidas");
    // si falla, la página igual funciona con el resto de la información.
    api.get(`/clientes/${user.id}/estado-cuenta`)
      .then(({ data }) => { if (!cancelado) setResumenCuenta(data.resumen) })
      .catch(() => {})

    return () => { cancelado = true }
  }, [user.id, intento])

  function reintentar() {
    setErrorCarga(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  function alternarOcultar() {
    const nuevo = !ocultar
    setOcultar(nuevo)
    try {
      localStorage.setItem(CLAVE_OCULTAR, nuevo ? '1' : '0')
    } catch {
      /* sin storage: la preferencia vive solo en esta sesión */
    }
  }

  async function solicitar() {
    setSolicitando(true)
    setError('')
    try {
      const { data } = await api.post(`/clientes/${user.id}/estado-cuenta/ampliacion-solicitar`)
      setResultado(data)
      setConfirmando(false)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud')
    } finally {
      setSolicitando(false)
    }
  }

  const tieneVencidas = (resumenCuenta?.cantidad_ordenes_vencidas || 0) > 0
  const monto = (v) => (ocultar ? `USD ${MASCARA}` : formatearUSD(v))

  // Niveles (15% / 30% / 50%) con su progreso según el promedio actual
  const niveles = useMemo(() => {
    if (!elegibilidad) return []
    const { linea_actual, promedio_mensual } = elegibilidad
    const lista = [...UMBRALES_AMPLIACION]
      .sort((a, b) => a.factor - b.factor)
      .map((n) => {
        const umbral = linea_actual * n.factor
        return {
          ...n,
          umbral,
          alcanzado: promedio_mensual >= umbral,
          progreso: umbral > 0 ? Math.min((promedio_mensual / umbral) * 100, 100) : 0,
          faltante: Math.max(umbral - promedio_mensual, 0),
        }
      })
    const idxActual = lista.map((n) => n.alcanzado).lastIndexOf(true)
    return lista.map((n, i) => ({ ...n, actual: i === idxActual }))
  }, [elegibilidad])

  const proximoNivel = niveles.find((n) => !n.alcanzado) || null

  // El índice 2 es "¿Cómo aumentar tu línea de crédito?"; con guarda por si cambia el contenido
  const explicacion = financiamientoInfo.contenido?.[2]
  const preguntas = (financiamientoInfo.contenido || []).slice(0, 2)

  const requisitos = elegibilidad
    ? [
        {
          cumplido: elegibilidad.califica,
          titulo: 'Promedio de compra suficiente',
          detalle: `Tu promedio mensual de los últimos 3 meses debe alcanzar al menos el ${Math.min(...UMBRALES_AMPLIACION.map((u) => u.factor)) * 100}% de tu línea actual`,
        },
        {
          // Informativo únicamente — no bloquea la solicitud (ver nota arriba)
          cumplido: !tieneVencidas,
          titulo: 'Sin órdenes vencidas',
          detalle: 'Debes estar al día con tus pagos, sin órdenes de crédito vencidas',
        },
      ]
    : []

  return (
    <LayoutPaginaPrincipal
      activo="ampliacion"
      titulo="Ampliar línea de crédito"
      subtitulo="Cuánto puedes ampliar tu crédito y qué se necesita para calificar"
      nav={NAV_UNIFICADO}
    >
      {cargando ? (
        <div className="ecb-root" aria-busy="true" aria-live="polite">
          <div className="ecb-skel eca-skel-hero" />
          <div className="ecb-skel ecb-skel--extracto" />
        </div>
      ) : errorCarga || !elegibilidad ? (
        <div className="ecb-root">
          <div className="ecb-error">
            <span className="ecb-error__icono"><AlertCircle size={28} /></span>
            <h2>No pudimos calcular tu elegibilidad</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="ecb-btn" onClick={reintentar}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </div>
      ) : resultado ? (
        <div className="ecb-root">
          <ResultadoAprobado resultado={resultado} />
        </div>
      ) : (
        <div className="ecb-root">
          {/* Tarjeta: línea actual + oportunidad */}
          <section className="ecb-tarjeta eca-hero" aria-label="Tu línea de crédito">
            <div className="ecb-tarjeta__brillo" aria-hidden="true" />

            <header className="ecb-tarjeta__cab">
              <div className="ecb-tarjeta__marca">
                <span className="ecb-tarjeta__logo"><TrendingUp size={16} /></span>
                <span>Ampliación de línea</span>
              </div>
              <div className="ecb-tarjeta__der">
                <span className={`ecb-estado ecb-estado--${elegibilidad.califica ? 'ok' : 'aviso'}`}>
                  <span className="ecb-estado__punto" aria-hidden="true" />
                  {elegibilidad.califica ? `Calificas +${elegibilidad.porcentaje_disponible}%` : 'Aún no calificas'}
                </span>
                <button
                  type="button"
                  className="ecb-ojo"
                  onClick={alternarOcultar}
                  aria-pressed={ocultar}
                  aria-label={ocultar ? 'Mostrar montos' : 'Ocultar montos'}
                >
                  {ocultar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </header>

            <div className="ecb-tarjeta__saldo">
              <span className="ecb-tarjeta__etiqueta">Línea actual</span>
              <Cifra valor={elegibilidad.linea_actual} oculto={ocultar} />
            </div>

            {elegibilidad.califica ? (
              <div className="eca-oportunidad">
                <div className="eca-oportunidad__texto">
                  <span>Línea nueva</span>
                  <Cifra valor={elegibilidad.nueva_linea} oculto={ocultar} className="eca-oportunidad__cifra" />
                  <small>
                    +{elegibilidad.porcentaje_disponible}% · según tu promedio de {monto(elegibilidad.promedio_mensual)}/mes
                  </small>
                </div>
                <button type="button" className="eca-hero__cta" onClick={() => { setError(''); setConfirmando(true) }}>
                  Solicitar ampliación
                </button>
              </div>
            ) : (
              <p className="eca-nota-hero">
                {proximoNivel ? (
                  <>
                    Te faltan <strong>{monto(proximoNivel.faltante)}</strong> en tu promedio mensual para
                    calificar a una ampliación de <strong>+{proximoNivel.porcentaje}%</strong>.
                  </>
                ) : (
                  'Sigue comprando para subir tu promedio mensual y calificar a una ampliación.'
                )}
              </p>
            )}

            <div className="eca-stats">
              <div className="eca-stat">
                <span className="eca-stat__label">Compra del trimestre</span>
                <strong className="eca-stat__valor">{monto(elegibilidad.total_trimestre)}</strong>
              </div>
              <div className="eca-stat">
                <span className="eca-stat__label">Promedio mensual</span>
                <strong className="eca-stat__valor">{monto(elegibilidad.promedio_mensual)}</strong>
              </div>
            </div>
          </section>

          {tieneVencidas && (
            <div className="ecb-alerta ecb-alerta--aviso" role="status">
              <AlertTriangle size={20} />
              <div className="ecb-alerta__texto">
                <strong>
                  Tienes {resumenCuenta.cantidad_ordenes_vencidas}{' '}
                  {resumenCuenta.cantidad_ordenes_vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}
                </strong>
                <p>
                  Suman {monto(resumenCuenta.deuda_vencida)}. Ponerte al día ayuda a mantener tu cuenta en buen estado.
                </p>
              </div>
              <Link to="/pagos" className="ecb-alerta__cta">Pagar ahora</Link>
            </div>
          )}

          <div className="eca-grid">
            {/* Niveles */}
            <section className="eca-card" aria-label="Niveles de ampliación">
              <h2 className="eca-card__titulo">Niveles de ampliación</h2>
              {explicacion && <p className="eca-card__intro">{explicacion.texto}</p>}

              <ul className="eca-niveles">
                {niveles.map((n) => (
                  <li
                    key={n.factor}
                    className={`eca-nivel ${n.alcanzado ? 'eca-nivel--alcanzado' : ''} ${n.actual ? 'eca-nivel--actual' : ''}`}
                  >
                    <div className="eca-nivel__cab">
                      <span className="eca-nivel__badge">+{n.porcentaje}%</span>
                      <span className="eca-nivel__umbral">
                        Promedio mensual ≥ <strong>{monto(n.umbral)}</strong>
                      </span>
                      {n.alcanzado ? (
                        <span className="ecb-chip ecb-chip--ok">
                          <CheckCircle2 size={12} /> {n.actual ? 'Tu nivel' : 'Alcanzado'}
                        </span>
                      ) : (
                        <span className="ecb-chip">Faltan {monto(n.faltante)}</span>
                      )}
                    </div>
                    <div
                      className="eca-nivel__pista"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(n.progreso)}
                      aria-label={`Progreso hacia el nivel +${n.porcentaje}%`}
                    >
                      <div className="eca-nivel__relleno" style={{ width: `${n.progreso}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="eca-lateral">
              {/* Requisitos */}
              <section className="eca-card" aria-label="Requisitos básicos">
                <h2 className="eca-card__titulo">Requisitos básicos</h2>
                <ul className="eca-requisitos">
                  {requisitos.map((r) => (
                    <li key={r.titulo}>
                      {r.cumplido ? (
                        <CheckCircle2 size={20} className="eca-requisitos__ok" />
                      ) : (
                        <XCircle size={20} className="eca-requisitos__pendiente" />
                      )}
                      <span>
                        <strong>{r.titulo}</strong>
                        <small>{r.detalle}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Preguntas frecuentes */}
              <section className="eca-card" aria-label="Preguntas frecuentes">
                <h2 className="eca-card__titulo"><Info size={18} /> Cómo funciona tu crédito</h2>
                <div className="eca-faq">
                  {preguntas.map((p) => (
                    <details key={p.subtitulo} className="eca-faq__item">
                      <summary>
                        <span>{p.subtitulo}</span>
                        <ChevronDown size={18} />
                      </summary>
                      <p>{p.texto}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {confirmando && elegibilidad && (
        <ConfirmarAmpliacion
          elegibilidad={elegibilidad}
          solicitando={solicitando}
          error={error}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={solicitar}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}
