import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  ArrowDownLeft,
  X,
} from 'lucide-react'
import { formatearUSD } from '../../utils/formato'
// Base visual compartida con la página principal de Estado de cuenta (clases ecb-*)
import './HistorialBancario.css'

// ---------------------------------------------------------------
// Historial estilo banca en línea — lo comparten Facturas y Pagos del
// estado de cuenta (misma estructura, distinto contenido).
//
//   · Tarjeta Índigo compacta con el total del período y datos extra.
//   · Filtro por período (Todo / Este mes / 3 meses / Este año) + buscador.
//   · Extracto agrupado por MES con subtotal; cada fila es un botón.
//   · "Ver más" de 15 en 15, estados de carga / error / vacío.
//   · Ojo para ocultar montos (misma preferencia que la página principal).
//
// Cada página normaliza sus registros a:
//   { key, raw, fecha, titulo, extra?, monto, chip: { label, tono }, textoBusqueda }
// ---------------------------------------------------------------

const CLAVE_OCULTAR = 'ec_ocultar_saldos'
const MASCARA = '••••••'
const PASO = 15

const PERIODOS = [
  { key: 'todo', label: 'Todo' },
  { key: 'mes', label: 'Este mes' },
  { key: 'trimestre', label: '3 meses' },
  { key: 'anio', label: 'Este año' },
]

const TIPOS = {
  factura: { Icono: Receipt, signo: '−' },
  pago: { Icono: ArrowDownLeft, signo: '+' },
}

function desdePeriodo(key) {
  const hoy = new Date()
  if (key === 'mes') return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  if (key === 'trimestre') return new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
  if (key === 'anio') return new Date(hoy.getFullYear(), 0, 1)
  return null
}

function claveMes(fecha) {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function etiquetaMes(fecha) {
  const texto = new Date(fecha).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function etiquetaDia(fecha) {
  const hoy = new Date()
  const d = new Date(fecha)
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).replace('.', '')
}

function etiquetaHora(fecha) {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
}

// Cifra "bancaria": moneda y decimales pequeños, enteros grandes
function Cifra({ valor, oculto }) {
  if (oculto) {
    return (
      <span className="ecb-cifra">
        <small className="ecb-cifra__moneda">USD</small>
        {MASCARA}
      </span>
    )
  }
  const [entero, decimales] = Math.abs(Number(valor || 0)).toFixed(2).split('.')
  return (
    <span className="ecb-cifra">
      <small className="ecb-cifra__moneda">USD</small>
      {Number(entero).toLocaleString('en-US')}
      <small className="ecb-cifra__dec">.{decimales}</small>
    </span>
  )
}

export default function HistorialBancario({
  tipo,
  items,
  hero,
  cargando,
  error,
  onReintentar,
  vacio,
  onAbrir,
  onDescargar,
}) {
  const { Icono: IconoFila, signo } = TIPOS[tipo]
  const [periodo, setPeriodo] = useState('todo')
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(PASO)
  const [descargando, setDescargando] = useState(null)
  const [errorDescarga, setErrorDescarga] = useState('')
  const [ocultar, setOcultar] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OCULTAR) === '1'
    } catch {
      return false
    }
  })

  function alternarOcultar() {
    const nuevo = !ocultar
    setOcultar(nuevo)
    try {
      localStorage.setItem(CLAVE_OCULTAR, nuevo ? '1' : '0')
    } catch {
      /* sin storage: la preferencia vive solo en esta sesión */
    }
  }

  // Registros del período (el hero suma esto; la búsqueda solo afina la lista)
  const delPeriodo = useMemo(() => {
    const desde = desdePeriodo(periodo)
    return [...items]
      .filter((it) => !desde || new Date(it.fecha) >= desde)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [items, periodo])

  const totalPeriodo = useMemo(
    () => delPeriodo.reduce((s, it) => s + it.monto, 0),
    [delPeriodo]
  )

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return delPeriodo
    return delPeriodo.filter((it) => it.textoBusqueda.includes(termino))
  }, [delPeriodo, busqueda])

  const grupos = useMemo(() => {
    const out = []
    filtrados.slice(0, visibles).forEach((it) => {
      const clave = claveMes(it.fecha)
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.clave === clave) ultimo.items.push(it)
      else out.push({ clave, titulo: etiquetaMes(it.fecha), items: [it] })
    })
    // El subtotal del mes se calcula sobre TODO el mes filtrado, no solo lo visible
    out.forEach((g) => {
      g.subtotal = filtrados
        .filter((it) => claveMes(it.fecha) === g.clave)
        .reduce((s, it) => s + it.monto, 0)
    })
    return out
  }, [filtrados, visibles])

  function cambiarPeriodo(p) {
    setPeriodo(p)
    setVisibles(PASO)
  }
  function cambiarBusqueda(v) {
    setBusqueda(v)
    setVisibles(PASO)
  }

  async function descargar(it) {
    setDescargando(it.key)
    setErrorDescarga('')
    try {
      await onDescargar(it.raw)
    } catch (err) {
      console.error(err)
      setErrorDescarga('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setDescargando(null)
    }
  }

  const periodoActual = PERIODOS.find((p) => p.key === periodo)
  const cantidad = delPeriodo.length
  const HeroIcono = hero.Icono

  // ---------- Cargando ----------
  if (cargando) {
    return (
      <div className="ecb-root" aria-busy="true" aria-live="polite">
        <div className="ecb-skel ech-skel-hero" />
        <div className="ecb-skel ecb-skel--extracto" />
      </div>
    )
  }

  // ---------- Error de carga ----------
  if (error) {
    return (
      <div className="ecb-root">
        <div className="ecb-error">
          <span className="ecb-error__icono"><AlertCircle size={28} /></span>
          <h2>{hero.errorTitulo}</h2>
          <p>Revisa tu conexión e inténtalo de nuevo.</p>
          <button type="button" className="ecb-btn" onClick={onReintentar}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ecb-root">
      {/* Tarjeta resumen */}
      <section className="ecb-tarjeta ech-hero" aria-label={hero.etiqueta}>
        <div className="ecb-tarjeta__brillo" aria-hidden="true" />

        <header className="ecb-tarjeta__cab">
          <div className="ecb-tarjeta__marca">
            <span className="ecb-tarjeta__logo"><HeroIcono size={16} /></span>
            <span>{hero.etiqueta}</span>
          </div>
          <div className="ecb-tarjeta__der">
            <span className="ecb-estado">
              <span className="ecb-estado__punto" aria-hidden="true" />
              {periodoActual.label}
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
          <span className="ecb-tarjeta__etiqueta">
            {cantidad} {cantidad === 1 ? hero.singular : hero.plural}
          </span>
          <Cifra valor={totalPeriodo} oculto={ocultar} />
        </div>

        {(hero.extras?.length > 0 || hero.cta) && (
          <footer className="ecb-tarjeta__pie ech-hero__pie">
            <div className="ech-hero__extras">
              {hero.extras?.map((ex) => {
                const ExIcono = ex.Icono
                return (
                  <span key={ex.texto} className={`ecb-vence ${ex.alerta ? 'ecb-vence--alerta' : ''}`}>
                    <ExIcono size={15} />
                    <span>
                      {ex.texto}
                      {ex.valor != null && ` · ${ocultar ? `USD ${MASCARA}` : formatearUSD(ex.valor)}`}
                    </span>
                  </span>
                )
              })}
            </div>
            {hero.cta && (
              <Link to={hero.cta.to} className="ech-hero__cta">{hero.cta.label}</Link>
            )}
          </footer>
        )}
      </section>

      {errorDescarga && (
        <div className="ecb-alerta ecb-alerta--aviso" role="alert">
          <AlertCircle size={18} />
          <div className="ecb-alerta__texto"><p>{errorDescarga}</p></div>
          <button type="button" className="ecb-alerta__cerrar" onClick={() => setErrorDescarga('')} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Extracto */}
      <section className="ecb-extracto" aria-label={hero.listaLabel}>
        <div className="ecb-extracto__cab">
          <h2 className="ecb-extracto__titulo">{hero.listaLabel}</h2>
          <div className="ecb-buscador">
            <Search size={17} />
            <input
              type="search"
              placeholder="Buscar por # o monto"
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              aria-label={`Buscar en ${hero.listaLabel.toLowerCase()}`}
            />
            {busqueda && (
              <button type="button" className="ecb-buscador__limpiar" onClick={() => cambiarBusqueda('')} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="ecb-filtros" role="tablist" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={periodo === p.key}
              className={`ecb-filtro ${periodo === p.key ? 'ecb-filtro--activo' : ''}`}
              onClick={() => cambiarPeriodo(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {grupos.length === 0 ? (
          <div className="ecb-vacio">
            <span className="ecb-vacio__icono"><IconoFila size={26} /></span>
            {items.length === 0 ? (
              <>
                <strong>{vacio.titulo}</strong>
                <p>{vacio.texto}</p>
                {vacio.cta && <Link to={vacio.cta.to} className="ecb-btn ech-btn-link">{vacio.cta.label}</Link>}
              </>
            ) : (
              <>
                <strong>Sin resultados</strong>
                <p>No hay movimientos con ese período o búsqueda.</p>
                <button type="button" className="ecb-link" onClick={() => { cambiarPeriodo('todo'); cambiarBusqueda('') }}>
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {grupos.map((g) => (
              <div key={g.clave} className="ecb-grupo">
                <p className="ecb-grupo__titulo ech-mes">
                  <span>{g.titulo}</span>
                  <span className="ech-mes__subtotal">
                    {ocultar ? MASCARA : `${signo}${formatearUSD(g.subtotal)}`}
                  </span>
                </p>
                <ul className="ecb-lista">
                  {g.items.map((it) => (
                    <li key={it.key} className="ecb-mov">
                      <button type="button" className="ecb-mov__main" onClick={() => onAbrir(it.raw)}>
                        <span className={`ecb-mov__icono ecb-mov__icono--${tipo}`}>
                          <IconoFila size={18} />
                        </span>
                        <span className="ecb-mov__info">
                          <span className="ecb-mov__titulo">{it.titulo}</span>
                          <span className="ecb-mov__sub">
                            <span>
                              {[etiquetaDia(it.fecha), etiquetaHora(it.fecha), it.extra].filter(Boolean).join(' · ')}
                            </span>
                            <span className={`ecb-chip ecb-chip--${it.chip.tono}`}>{it.chip.label}</span>
                          </span>
                        </span>
                        <span className={`ecb-mov__monto ecb-mov__monto--${tipo}`}>
                          {ocultar ? MASCARA : `${signo}${formatearUSD(it.monto)}`}
                        </span>
                      </button>
                      <div className="ecb-mov__acciones">
                        <button
                          type="button"
                          className="ecb-mini"
                          onClick={() => descargar(it)}
                          disabled={descargando === it.key}
                          aria-label={`Descargar ${it.titulo}`}
                        >
                          {descargando === it.key ? <Loader2 size={15} className="ecb-giro" /> : <Download size={15} />}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {filtrados.length > visibles && (
              <button type="button" className="ecb-vermas" onClick={() => setVisibles((v) => v + PASO)}>
                Ver más ({filtrados.length - visibles})
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
