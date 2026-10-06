import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, CheckCircle2, XCircle, Loader2, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import financiamientoInfo, { UMBRALES_AMPLIACION } from '../data/financiamiento'
import './EstadoCuenta.css'

// ---------------------------------------------------------------
// Ampliación de línea de crédito — migrada a LayoutPaginaPrincipal +
// clases .ec-* compartidas con EstadoCuenta.jsx (mismo patrón que
// PagosEstadoCuenta.jsx/FacturasEstadoCuenta.jsx). Antes vivía con su
// propio header y HistorialEstadoCuenta.css, desconectada del resto
// del módulo.
//
// Se agregó contexto adicional que el cliente no tenía antes: cuánto
// lleva comprado en el trimestre, la explicación completa de cómo
// funciona el financiamiento (financiamiento.js — antes escrito pero
// nunca importado en ningún lado) y un checklist de requisitos
// básicos, incluyendo "sin órdenes vencidas". Ese último requisito es
// solo informativo por ahora: el backend no bloquea la elegibilidad
// ni la solicitud si hay vencidas, solo la línea de crédito según el
// promedio de compra (decisión explícita, no cambiar sin avisar).
// ---------------------------------------------------------------

import { formatearUSD } from '../utils/formato'

export default function AmpliacionEstadoCuenta() {
  const { user } = useAuth()
  const [elegibilidad, setElegibilidad] = useState(null)
  const [resumenCuenta, setResumenCuenta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [solicitando, setSolicitando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/clientes/${user.id}/estado-cuenta/ampliacion-elegibilidad`)
      .then(({ data }) => setElegibilidad(data))
      .catch(() => setError('No se pudo calcular tu elegibilidad'))
      .finally(() => setCargando(false))

    // Dato no crítico (solo para el checklist de "sin órdenes vencidas");
    // si falla, la página igual funciona con el resto de la información.
    api.get(`/clientes/${user.id}/estado-cuenta`)
      .then(({ data }) => setResumenCuenta(data.resumen))
      .catch(() => {})
  }, [user.id])

  async function solicitar() {
    setSolicitando(true)
    setError('')
    try {
      const { data } = await api.post(`/clientes/${user.id}/estado-cuenta/ampliacion-solicitar`)
      setResultado(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud')
    } finally {
      setSolicitando(false)
    }
  }

  const tieneVencidas = (resumenCuenta?.cantidad_ordenes_vencidas || 0) > 0

  // Para el estado "aún no calificas": el siguiente nivel alcanzable y
  // cuánto le falta en promedio mensual para llegar a él.
  const proximoNivel = useMemo(() => {
    if (!elegibilidad || elegibilidad.califica) return null
    const ordenAscendente = [...UMBRALES_AMPLIACION].sort((a, b) => a.factor - b.factor)
    const siguiente = ordenAscendente.find(
      (u) => elegibilidad.promedio_mensual < elegibilidad.linea_actual * u.factor
    )
    if (!siguiente) return null
    return {
      ...siguiente,
      faltante: elegibilidad.linea_actual * siguiente.factor - elegibilidad.promedio_mensual,
    }
  }, [elegibilidad])

  return (
    <LayoutPaginaPrincipal
      activo="ampliacion"
      titulo="Ampliar línea de crédito"
      subtitulo="Cuánto puedes ampliar tu crédito y qué se necesita para calificar"
      nav={NAV_UNIFICADO}
    >
      <div className="ec-dashboard">
        {error && !elegibilidad && !cargando && (
          <div className="ec-alerta-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {cargando ? (
          <div className="ec-estado-cargando">
            <Loader2 className="ec-spinner" size={28} />
            <p>Calculando tu elegibilidad…</p>
          </div>
        ) : resultado ? (
          <ResultadoAprobado resultado={resultado} />
        ) : elegibilidad && (
          <>
            <section className="ec-kpis">
              <div className="ec-kpi">
                <span className="ec-kpi__label">Línea actual</span>
                <strong className="ec-kpi__valor">{formatearUSD(elegibilidad.linea_actual)}</strong>
              </div>
              <div className="ec-kpi">
                <span className="ec-kpi__label">Compra del trimestre</span>
                <strong className="ec-kpi__valor">{formatearUSD(elegibilidad.total_trimestre)}</strong>
              </div>
              <div className="ec-kpi">
                <span className="ec-kpi__label">Promedio mensual</span>
                <strong className="ec-kpi__valor">{formatearUSD(elegibilidad.promedio_mensual)}</strong>
              </div>
            </section>

            {tieneVencidas && (
              <div className="ec-banner-alerta ec-banner-alerta--alto">
                <AlertCircle size={18} />
                <div>
                  <strong>
                    Tienes {resumenCuenta.cantidad_ordenes_vencidas}{' '}
                    {resumenCuenta.cantidad_ordenes_vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}
                  </strong>
                  <p>
                    Suman {formatearUSD(resumenCuenta.deuda_vencida)}. Ponerte al día ayuda a mantener tu cuenta en
                    buen estado.
                  </p>
                </div>
              </div>
            )}

            {elegibilidad.califica ? (
              <section className="ec-amp-hero">
                <TrendingUp size={28} />
                <h2>Calificas para una ampliación</h2>
                <p className="ec-amp-hero__texto">
                  Según tu promedio de compra de los últimos 3 meses ({formatearUSD(elegibilidad.promedio_mensual)}
                  /mes), puedes ampliar tu línea actual en un <strong>{elegibilidad.porcentaje_disponible}%</strong>.
                </p>
                <div className="ec-amp-hero__comparacion">
                  <div>
                    <span>Línea actual</span>
                    <strong>{formatearUSD(elegibilidad.linea_actual)}</strong>
                  </div>
                  <span className="ec-amp-hero__flecha">→</span>
                  <div>
                    <span>Línea nueva</span>
                    <strong className="ec-amp-hero__monto--verde">{formatearUSD(elegibilidad.nueva_linea)}</strong>
                  </div>
                </div>
                {error && <p className="ec-amp-hero__error">{error}</p>}
                <button className="ec-amp-hero__btn" onClick={solicitar} disabled={solicitando}>
                  {solicitando ? 'Procesando…' : `Solicitar ampliación (+${elegibilidad.porcentaje_disponible}%)`}
                </button>
              </section>
            ) : (
              <section className="ec-amp-hero ec-amp-hero--no-califica">
                <XCircle size={28} />
                <h2>Aún no calificas</h2>
                <p className="ec-amp-hero__texto">
                  Tu promedio de compra mensual es {formatearUSD(elegibilidad.promedio_mensual)}.
                  {proximoNivel && (
                    <>
                      {' '}
                      Te faltan <strong>{formatearUSD(proximoNivel.faltante)}</strong> en tu promedio mensual para
                      calificar a una ampliación de <strong>+{proximoNivel.porcentaje}%</strong>.
                    </>
                  )}
                </p>
              </section>
            )}

            <NivelesAmpliacion elegibilidad={elegibilidad} />
            <RequisitosAmpliacion elegibilidad={elegibilidad} tieneVencidas={tieneVencidas} />
            <FaqCredito />
          </>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}

function ResultadoAprobado({ resultado }) {
  return (
    <section className="ec-amp-hero ec-amp-hero--resultado">
      <CheckCircle2 size={40} color="#059669" />
      <h2>¡Ampliación aprobada!</h2>
      <p className="ec-amp-hero__texto">Tu nueva línea de crédito es</p>
      <strong className="ec-amp-hero__monto-grande">{formatearUSD(resultado.linea_nueva)}</strong>
      <p className="ec-amp-hero__detalle">
        +{resultado.porcentaje_aplicado}% sobre {formatearUSD(resultado.linea_anterior)}
      </p>
    </section>
  )
}

// Explicación visual de los 3 niveles de ampliación (15% / 30% / 50%),
// con barra de progreso según el promedio de compra actual del cliente.
function NivelesAmpliacion({ elegibilidad }) {
  const { linea_actual, promedio_mensual } = elegibilidad
  const explicacion = financiamientoInfo.contenido[2] // "¿Cómo aumentar tu línea de crédito?"
  const nivelesOrdenados = [...UMBRALES_AMPLIACION].sort((a, b) => a.factor - b.factor)

  return (
    <section className="ec-tiers">
      <div className="ec-tiers__header">
        <Info size={16} />
        <span>{explicacion.subtitulo}</span>
      </div>
      <p className="ec-tiers__intro">{explicacion.texto}</p>

      <div className="ec-tiers__lista">
        {nivelesOrdenados.map((nivel) => {
          const umbral = linea_actual * nivel.factor
          const alcanzado = promedio_mensual >= umbral
          const progreso = umbral > 0 ? Math.min((promedio_mensual / umbral) * 100, 100) : 0
          return (
            <div key={nivel.factor} className={`ec-tiers__nivel ${alcanzado ? 'ec-tiers__nivel--alcanzado' : ''}`}>
              <div className="ec-tiers__nivel-info">
                <div>
                  <span className="ec-tiers__nivel-porcentaje">+{nivel.porcentaje}%</span>
                  <span className="ec-tiers__nivel-umbral">Promedio mensual ≥ {formatearUSD(umbral)}</span>
                </div>
                {alcanzado && <CheckCircle2 size={16} className="ec-tiers__check" />}
              </div>
              <div className="ec-tiers__barra-wrap">
                <div className="ec-tiers__barra" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Checklist de requisitos básicos. "Sin órdenes vencidas" es
// informativo únicamente — no bloquea el botón de solicitar (ver nota
// arriba del componente).
function RequisitosAmpliacion({ elegibilidad, tieneVencidas }) {
  const factorMinimo = Math.min(...UMBRALES_AMPLIACION.map((u) => u.factor)) * 100

  const requisitos = [
    {
      cumplido: elegibilidad.califica,
      titulo: 'Promedio de compra suficiente',
      detalle: `Tu promedio mensual de los últimos 3 meses debe alcanzar al menos el ${factorMinimo}% de tu línea actual`,
    },
    {
      cumplido: !tieneVencidas,
      titulo: 'Sin órdenes vencidas',
      detalle: 'Debes estar al día con tus pagos, sin órdenes de crédito vencidas',
    },
  ]

  return (
    <section className="ec-requisitos">
      <p className="ec-requisitos__titulo">Requisitos básicos</p>
      <ul className="ec-requisitos__lista">
        {requisitos.map((r) => (
          <li key={r.titulo} className="ec-requisitos__item">
            {r.cumplido ? (
              <CheckCircle2 size={18} className="ec-requisitos__icono ec-requisitos__icono--ok" />
            ) : (
              <XCircle size={18} className="ec-requisitos__icono ec-requisitos__icono--pendiente" />
            )}
            <div>
              <span className="ec-requisitos__item-titulo">{r.titulo}</span>
              <span className="ec-requisitos__item-detalle">{r.detalle}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Reutiliza financiamientoInfo (antes escrito pero nunca conectado en
// ninguna página) para explicar qué es la línea de crédito y cómo se
// calcula la deuda.
function FaqCredito() {
  const preguntas = financiamientoInfo.contenido.slice(0, 2)
  return (
    <section className="ec-faq-credito">
      {preguntas.map((p) => (
        <div key={p.subtitulo} className="ec-faq-credito__item">
          <p className="ec-faq-credito__pregunta">{p.subtitulo}</p>
          <p className="ec-faq-credito__respuesta">{p.texto}</p>
        </div>
      ))}
    </section>
  )
}