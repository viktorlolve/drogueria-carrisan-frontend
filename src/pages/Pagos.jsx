import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Info,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  X,
} from 'lucide-react'
import api from '../api/axios'
import { formatearUSD, formatearVES, formatearFechaCorta } from '../utils/formato'
import './Pagos.css'

// ---------------------------------------------------------------
// Datos de pago de la empresa. Fijos por ahora (igual que el resto
// del proyecto trata sus constantes de marca); si más adelante se
// necesita editarlos desde el admin, se puede mover a una tabla como
// se hizo con la tasa de cambio.
// Cada `campos[]` es una fila con botón de copiar.
// TODO: reemplazar los valores XXXX por los datos reales antes de publicar.
// ---------------------------------------------------------------
const CUENTAS = [
  {
    id: 'banesco',
    Icono: Landmark,
    titulo: 'Transferencia Banesco',
    subtitulo: 'Cuenta corriente',
    campos: [
      { label: 'Número de cuenta', valor: '0134-XXXX-XX-XXXXXXXXXX' },
      { label: 'Titular', valor: 'Droguería Carrisan, C.A.' },
      { label: 'RIF', valor: 'J-XXXXXXXX-X' },
    ],
  },
  {
    id: 'pago-movil',
    Icono: Smartphone,
    titulo: 'Pago Móvil',
    subtitulo: 'Pago inmediato desde tu app bancaria',
    campos: [
      { label: 'Teléfono', valor: '0414-XXXXXXX' },
      { label: 'Titular', valor: 'Droguería Carrisan, C.A.' },
      { label: 'RIF', valor: 'J-XXXXXXXX-X' },
    ],
  },
]

const PASOS = ['Órdenes', 'Datos de pago', 'Comprobante']
const TAMANO_MAX_MB = 10

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Fallback para navegadores/WebViews sin Clipboard API
    try {
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function formatearTamano(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function textoArticulos(orden) {
  if (!Array.isArray(orden.ordenes_items)) return null
  const n = orden.ordenes_items.filter((i) => i.anulado !== true).length
  return n === 1 ? '1 artículo' : `${n} artículos`
}

// ---------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------
function BotonCopiar({ valor, etiqueta, conTexto = false }) {
  const [copiado, setCopiado] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copiar() {
    const ok = await copiarTexto(valor)
    if (!ok) return
    setCopiado(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <button
      type="button"
      className={`pg-copiar ${copiado ? 'pg-copiar--ok' : ''} ${conTexto ? 'pg-copiar--texto' : ''}`}
      onClick={copiar}
      aria-label={copiado ? 'Copiado' : etiqueta}
    >
      {copiado ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
      {conTexto && <span aria-live="polite">{copiado ? 'Copiado' : etiqueta}</span>}
    </button>
  )
}

function Pasos({ pasoActual, onIr, bloqueado }) {
  return (
    <ol className="pg-pasos" aria-label="Progreso del pago">
      {PASOS.map((label, i) => {
        const n = i + 1
        const completado = n < pasoActual
        const actual = n === pasoActual
        const estado = completado ? 'completado' : actual ? 'actual' : 'pendiente'
        return (
          <li
            key={label}
            className={`pg-paso pg-paso--${estado}`}
            aria-current={actual ? 'step' : undefined}
          >
            {completado && !bloqueado ? (
              <button type="button" className="pg-paso__btn" onClick={() => onIr(n)}>
                <span className="pg-paso__punto"><Check size={14} strokeWidth={3} /></span>
                <span className="pg-paso__label">{label}</span>
              </button>
            ) : (
              <span className="pg-paso__btn">
                <span className="pg-paso__punto">
                  {completado ? <Check size={14} strokeWidth={3} /> : n}
                </span>
                <span className="pg-paso__label">{label}</span>
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Resumen({ ordenes, totalUsd, totalVes, tasaVes }) {
  const [abierto, setAbierto] = useState(false)
  const n = ordenes.length

  return (
    <section className={`pg-resumen ${abierto ? 'pg-resumen--abierto' : ''}`} aria-label="Resumen del pago">
      <button
        type="button"
        className="pg-resumen__toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="pg-resumen__toggle-izq">
          <span className="pg-resumen__titulo">Resumen del pago</span>
          <span className="pg-resumen__sub">
            {n === 0 ? 'Sin órdenes seleccionadas' : n === 1 ? '1 orden' : `${n} órdenes`}
          </span>
        </span>
        <span className="pg-resumen__mini">{totalVes != null ? formatearVES(totalVes) : '—'}</span>
        <ChevronDown size={18} className="pg-resumen__chevron" aria-hidden="true" />
      </button>

      <div className="pg-resumen__cuerpo">
        {n === 0 ? (
          <p className="pg-resumen__vacio">Elige al menos una orden para ver el monto a pagar.</p>
        ) : (
          <ul className="pg-resumen__lista">
            {ordenes.map((o) => (
              <li key={o.id}>
                <span>Orden #{o.id}</span>
                <span>{formatearUSD(o.total_usd)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="pg-resumen__fila">
          <span>Subtotal en dólares</span>
          <span>{formatearUSD(totalUsd)}</span>
        </div>
        {tasaVes && (
          <div className="pg-resumen__fila">
            <span>Tasa de cambio</span>
            <span>{formatearVES(tasaVes)} / USD</span>
          </div>
        )}

        <div className="pg-resumen__total">
          <span>Total a transferir</span>
          <strong>{totalVes != null ? formatearVES(totalVes) : '—'}</strong>
        </div>
      </div>
    </section>
  )
}

function PantallaCentrada({ children }) {
  return <div className="pg-page pg-page--centrado">{children}</div>
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
function Pagos() {
  const location = useLocation()

  const [ordenes, setOrdenes] = useState([])
  const [seleccionadas, setSeleccionadas] = useState(() => location.state?.ordenIds || [])
  const [tasaVes, setTasaVes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [error, setError] = useState('')

  const [paso, setPaso] = useState(1)
  const [comprobante, setComprobante] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [reporteCreado, setReporteCreado] = useState(null)

  const primerRender = useRef(true)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const [resOrdenes, resTasa] = await Promise.all([
          api.get('/orders/pendientes-pago'),
          api.get('/prices'),
        ])
        if (cancelado) return
        setOrdenes(resOrdenes.data)
        setTasaVes(resTasa.data.usd_a_ves)
      } catch (err) {
        console.error(err)
        if (!cancelado) setErrorCarga(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [intento])

  function reintentar() {
    setErrorCarga(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  // Al cambiar de paso, volver arriba (en móvil el paso nuevo queda fuera de vista)
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paso])

  const ordenesSeleccionadas = useMemo(
    () => ordenes.filter((o) => seleccionadas.includes(o.id)),
    [ordenes, seleccionadas]
  )

  const totalUsd = ordenesSeleccionadas.reduce((sum, o) => sum + Number(o.total_usd), 0)
  const totalVes = tasaVes ? totalUsd * tasaVes : null
  const montoCopiable = totalVes != null ? totalVes.toFixed(2).replace('.', ',') : ''

  const todasSeleccionadas = ordenes.length > 0 && ordenesSeleccionadas.length === ordenes.length

  // Vista previa del comprobante (solo imágenes)
  const previewUrl = useMemo(
    () => (comprobante && comprobante.type.startsWith('image/') ? URL.createObjectURL(comprobante) : null),
    [comprobante]
  )
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function toggleOrden(id) {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleTodas() {
    setSeleccionadas(todasSeleccionadas ? [] : ordenes.map((o) => o.id))
  }

  function elegirArchivo(archivo) {
    if (!archivo) return
    const esValido = archivo.type.startsWith('image/') || archivo.type === 'application/pdf'
    if (!esValido) {
      setError('Formato no permitido. Sube una imagen (foto o captura) o un PDF.')
      return
    }
    if (archivo.size > TAMANO_MAX_MB * 1024 * 1024) {
      setError(`El archivo pesa más de ${TAMANO_MAX_MB} MB. Prueba con una captura más liviana.`)
      return
    }
    setError('')
    setComprobante(archivo)
  }

  function onDrop(e) {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files?.[0])
  }

  function irAPaso(n) {
    setError('')
    setPaso(n)
  }

  async function handleSubirComprobante() {
    if (!comprobante) {
      setError('Debes adjuntar el comprobante de pago')
      return
    }
    setError('')
    setSubiendo(true)

    try {
      const formData = new FormData()
      formData.append('archivo', comprobante)

      const { data: subida } = await api.post('/uploads/comprobante', formData)

      // Se envían solo las órdenes que realmente están pendientes (las del
      // state de navegación podrían estar desactualizadas)
      const { data } = await api.post('/reportes-pago', {
        orden_ids: ordenesSeleccionadas.map((o) => o.id),
        url_comprobante: subida.url,
      })

      setReporteCreado(data)
      setPaso(4)
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos registrar tu reporte de pago')
    } finally {
      setSubiendo(false)
    }
  }

  // ---------------------------------------------------------------
  // Cargando (skeleton con la misma forma de la página)
  // ---------------------------------------------------------------
  if (cargando) {
    return (
      <div className="pg-page" aria-busy="true" aria-live="polite">
        <div className="pg-container">
          <div className="pg-skel pg-skel--titulo" />
          <div className="pg-skel pg-skel--pasos" />
          <div className="pg-layout">
            <div className="pg-main">
              <div className="pg-card">
                <div className="pg-skel pg-skel--linea" />
                <div className="pg-skel pg-skel--orden" />
                <div className="pg-skel pg-skel--orden" />
                <div className="pg-skel pg-skel--orden" />
              </div>
            </div>
            <aside className="pg-aside">
              <div className="pg-skel pg-skel--resumen" />
            </aside>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Error de carga (antes se mostraba "No tienes pagos pendientes", que engañaba)
  // ---------------------------------------------------------------
  if (errorCarga) {
    return (
      <PantallaCentrada>
        <div className="pg-estado">
          <div className="pg-estado__icono pg-estado__icono--error">
            <AlertCircle size={30} />
          </div>
          <h1>No pudimos cargar tus pagos</h1>
          <p>Revisa tu conexión e inténtalo de nuevo.</p>
          <button type="button" className="pg-boton pg-boton--primario" onClick={reintentar}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </PantallaCentrada>
    )
  }

  // ---------------------------------------------------------------
  // Sin pagos pendientes
  // ---------------------------------------------------------------
  if (ordenes.length === 0 && !reporteCreado) {
    return (
      <PantallaCentrada>
        <div className="pg-estado">
          <div className="pg-estado__icono pg-estado__icono--ok">
            <CheckCircle2 size={32} />
          </div>
          <h1>No tienes pagos pendientes</h1>
          <p>Cuando tengas una orden lista para pagar, aparecerá aquí.</p>
          <Link to="/orders" className="pg-boton pg-boton--primario">Ver mis órdenes</Link>
        </div>
      </PantallaCentrada>
    )
  }

  // ---------------------------------------------------------------
  // Confirmación final (después de crear el reporte)
  // ---------------------------------------------------------------
  if (reporteCreado) {
    return (
      <PantallaCentrada>
        <div className="pg-exito">
          <svg className="pg-exito__check" viewBox="0 0 52 52" aria-hidden="true">
            <circle className="pg-exito__circulo" cx="26" cy="26" r="24" fill="none" />
            <path className="pg-exito__tilde" fill="none" d="M15 27l8 8 14-16" />
          </svg>

          <h1>¡Pago reportado!</h1>
          <p className="pg-exito__texto">
            Reportaste tu pago por <strong>{formatearVES(reporteCreado.monto_bs)}</strong>.
            Nuestro equipo lo verificará y te avisaremos.
          </p>

          <ul className="pg-exito__ordenes">
            {ordenesSeleccionadas.map((o) => (
              <li key={o.id}>Orden #{o.id}</li>
            ))}
          </ul>

          <ol className="pg-exito__siguiente">
            <li>
              <span className="pg-exito__num pg-exito__num--hecho"><Check size={13} strokeWidth={3} /></span>
              <span><strong>Comprobante recibido</strong><small>Ya quedó registrado en tu cuenta.</small></span>
            </li>
            <li>
              <span className="pg-exito__num">2</span>
              <span><strong>Verificación del pago</strong><small>Nuestro equipo confirma que el monto llegó.</small></span>
            </li>
            <li>
              <span className="pg-exito__num">3</span>
              <span><strong>Te avisamos</strong><small>Recibirás una notificación y tu orden avanza.</small></span>
            </li>
          </ol>

          <div className="pg-exito__acciones">
            <Link to="/orders" className="pg-boton pg-boton--primario">Volver a mis órdenes</Link>
            <Link to="/home" className="pg-boton pg-boton--secundario">Ir al inicio</Link>
          </div>
        </div>
      </PantallaCentrada>
    )
  }

  // ---------------------------------------------------------------
  // Flujo principal
  // ---------------------------------------------------------------
  return (
    <div className="pg-page">
      <div className="pg-container">
        <header className="pg-head">
          <Link to="/orders" className="pg-volver">
            <ArrowLeft size={16} /> Mis órdenes
          </Link>
          <div className="pg-head__fila">
            <h1 className="pg-title">Pagar orden{seleccionadas.length > 1 ? 'es' : ''}</h1>
            <span className="pg-seguro">
              <ShieldCheck size={15} /> Cada pago lo verifica nuestro equipo
            </span>
          </div>
        </header>

        <Pasos pasoActual={paso} onIr={irAPaso} bloqueado={subiendo} />

        <div className="pg-layout">
          <main className="pg-main">
            {error && (
              <div className="pg-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* ---------- PASO 1: elegir órdenes ---------- */}
            {paso === 1 && (
              <section className="pg-card">
                <div className="pg-card__cabecera">
                  <div>
                    <h2 className="pg-card__titulo">Selecciona las órdenes a pagar</h2>
                    <p className="pg-card__desc">Puedes pagar varias órdenes con un solo comprobante.</p>
                  </div>
                  {ordenes.length > 1 && (
                    <button type="button" className="pg-link" onClick={toggleTodas}>
                      {todasSeleccionadas ? 'Quitar todas' : 'Seleccionar todas'}
                    </button>
                  )}
                </div>

                <div className="pg-ordenes">
                  {ordenes.map((orden) => {
                    const activa = seleccionadas.includes(orden.id)
                    const fecha = formatearFechaCorta(orden.created_at)
                    const articulos = textoArticulos(orden)
                    const meta = [fecha, articulos].filter(Boolean).join(' · ')
                    return (
                      <label key={orden.id} className={`pg-orden ${activa ? 'pg-orden--activa' : ''}`}>
                        <input
                          type="checkbox"
                          className="pg-orden__input"
                          checked={activa}
                          onChange={() => toggleOrden(orden.id)}
                        />
                        <span className="pg-orden__check" aria-hidden="true">
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className="pg-orden__info">
                          <span className="pg-orden__numero">Orden #{orden.id}</span>
                          {meta && <span className="pg-orden__meta">{meta}</span>}
                          {orden.estado_pago === 'rechazado' && (
                            <span className="pg-chip pg-chip--error">
                              <AlertCircle size={12} /> Pago rechazado: vuelve a reportarlo
                            </span>
                          )}
                        </span>
                        <span className="pg-orden__monto">{formatearUSD(orden.total_usd)}</span>
                      </label>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="pg-boton pg-boton--primario pg-boton--bloque"
                  disabled={ordenesSeleccionadas.length === 0}
                  onClick={() => irAPaso(2)}
                >
                  {ordenesSeleccionadas.length > 1
                    ? `Continuar con ${ordenesSeleccionadas.length} órdenes`
                    : 'Continuar'}
                  <ArrowRight size={16} />
                </button>
              </section>
            )}

            {/* ---------- PASO 2: datos de pago ---------- */}
            {paso === 2 && (
              <section className="pg-card">
                <h2 className="pg-card__titulo">Realiza tu pago</h2>
                <p className="pg-card__desc">
                  Transfiere el monto exacto en bolívares a cualquiera de estas cuentas.
                </p>

                <div className="pg-monto">
                  <div className="pg-monto__texto">
                    <span className="pg-monto__label">Monto exacto a transferir</span>
                    <strong className="pg-monto__valor">{formatearVES(totalVes)}</strong>
                    <span className="pg-monto__ref">
                      Equivale a {formatearUSD(totalUsd)}
                      {tasaVes ? ` · tasa ${formatearVES(tasaVes)}` : ''}
                    </span>
                  </div>
                  {montoCopiable && (
                    <BotonCopiar valor={montoCopiable} etiqueta="Copiar monto" conTexto />
                  )}
                </div>

                <div className="pg-cuentas">
                  {CUENTAS.map(({ id, Icono, titulo, subtitulo, campos }) => (
                    <article key={id} className="pg-cuenta">
                      <header className="pg-cuenta__cab">
                        <span className="pg-cuenta__icono"><Icono size={20} /></span>
                        <span>
                          <span className="pg-cuenta__titulo">{titulo}</span>
                          <span className="pg-cuenta__sub">{subtitulo}</span>
                        </span>
                      </header>
                      <dl className="pg-cuenta__campos">
                        {campos.map((c) => (
                          <div key={c.label} className="pg-cuenta__campo">
                            <div>
                              <dt>{c.label}</dt>
                              <dd>{c.valor}</dd>
                            </div>
                            <BotonCopiar valor={c.valor} etiqueta={`Copiar ${c.label.toLowerCase()}`} />
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>

                <p className="pg-aviso">
                  <Info size={16} />
                  <span>Guarda la captura o foto de tu pago: la necesitas en el siguiente paso.</span>
                </p>

                <div className="pg-acciones">
                  <button type="button" className="pg-boton pg-boton--secundario" onClick={() => irAPaso(1)}>
                    Atrás
                  </button>
                  <button type="button" className="pg-boton pg-boton--primario" onClick={() => irAPaso(3)}>
                    Ya pagué, subir comprobante <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}

            {/* ---------- PASO 3: subir comprobante ---------- */}
            {paso === 3 && (
              <section className="pg-card">
                <h2 className="pg-card__titulo">Sube tu comprobante</h2>
                <p className="pg-card__desc">
                  Adjunta la foto o captura de tu pago por <strong>{formatearVES(totalVes)}</strong>.
                </p>

                {!comprobante ? (
                  <label
                    className={`pg-dropzone ${arrastrando ? 'pg-dropzone--activa' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setArrastrando(true) }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false)
                    }}
                    onDrop={onDrop}
                  >
                    <input
                      type="file"
                      className="pg-dropzone__input"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        elegirArchivo(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                    <span className="pg-dropzone__icono"><UploadCloud size={28} /></span>
                    <span className="pg-dropzone__titulo">
                      {arrastrando ? 'Suelta el archivo aquí' : 'Toca para elegir o arrastra tu comprobante'}
                    </span>
                    <span className="pg-dropzone__sub">Imagen o PDF · hasta {TAMANO_MAX_MB} MB</span>
                  </label>
                ) : (
                  <div className="pg-archivo">
                    <div className="pg-archivo__vista">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Vista previa del comprobante" />
                      ) : (
                        <FileText size={30} />
                      )}
                    </div>
                    <div className="pg-archivo__info">
                      <span className="pg-archivo__nombre">{comprobante.name}</span>
                      <span className="pg-archivo__meta">{formatearTamano(comprobante.size)}</span>
                      <div className="pg-archivo__acciones">
                        <label className="pg-link pg-archivo__cambiar">
                          Cambiar archivo
                          <input
                            type="file"
                            className="pg-dropzone__input"
                            accept="image/*,application/pdf"
                            disabled={subiendo}
                            onChange={(e) => {
                              elegirArchivo(e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pg-archivo__quitar"
                      onClick={() => setComprobante(null)}
                      disabled={subiendo}
                      aria-label="Quitar archivo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="pg-acciones">
                  <button
                    type="button"
                    className="pg-boton pg-boton--secundario"
                    onClick={() => irAPaso(2)}
                    disabled={subiendo}
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    className="pg-boton pg-boton--primario"
                    onClick={handleSubirComprobante}
                    disabled={subiendo || !comprobante}
                  >
                    {subiendo ? (
                      <><span className="pg-spinner" aria-hidden="true" /> Enviando...</>
                    ) : (
                      'Enviar comprobante'
                    )}
                  </button>
                </div>
              </section>
            )}
          </main>

          <aside className="pg-aside">
            <Resumen
              ordenes={ordenesSeleccionadas}
              totalUsd={totalUsd}
              totalVes={totalVes}
              tasaVes={tasaVes}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Pagos
