import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity, Server, Database, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Gauge, KeyRound, Pause, Play, Cpu, Timer, ServerCrash, Flag,
} from 'lucide-react'
import api from '../../api/axios'
import './MonitoreoAdmin.css'

// ---------------------------------------------------------------
// MonitoreoAdmin — estado del sistema para el admin (el dueño).
//
// Consume GET /admin/monitoreo (backend/src/controllers/monitoreo.controller.js).
// Página autónoma: no recibe props y no depende de otras secciones del
// panel, así que se puede montar en cualquier ruta (/admin/monitoreo).
//
// Consumo de recursos: refresca cada INTERVALO_MS solo mientras la
// pestaña está visible y el auto-refresh está activo; nunca superpone
// dos peticiones. El backend además cachea la respuesta 10 s.
//
// NOTA DE LINT: `cargar` es una cadena de .then() y NO un async/await.
// eslint-plugin-react-hooks v6 (React Compiler) marca cualquier `async`
// con setState aunque el setState esté después del await — ver la
// sección "Lint" del AGENTS.md del frontend. Mismo patrón que
// Vademecum.jsx y ProductoDetalle.jsx.
// ---------------------------------------------------------------

const INTERVALO_MS = 30_000

const NIVEL = {
  ok: { label: 'Todo en orden', Icono: CheckCircle2 },
  warn: { label: 'Requiere atención', Icono: AlertTriangle },
  error: { label: 'Problema crítico', Icono: XCircle },
}

const NOMBRES_TABLA = {
  users: 'Clientes', productos: 'Productos', ordenes: 'Órdenes', staff: 'Personal',
  push_subscriptions: 'Suscripciones push', notificaciones: 'Notificaciones',
  facturas: 'Facturas', pagos: 'Pagos',
}

function formatoUptime(seg) {
  if (seg == null) return '—'
  const d = Math.floor(seg / 86400)
  const h = Math.floor((seg % 86400) / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function tiempoRelativo(iso) {
  if (!iso) return 'nunca'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

const ms = (v) => (v == null ? '—' : `${v} ms`)
const num = (v) => (v == null ? '—' : Number(v).toLocaleString('es-VE'))

// Un job apagado por su env var NO es un fallo: es una decisión del dueño
// (y el backfill de BD es previo). Por eso pill neutro, sin alerta.
function estadoJob(j) {
  if (!j.programado) return { clase: 'neutral', texto: 'Apagada (flag off)' }
  if (j.ultimoError) return { clase: 'error', texto: 'Falló' }
  if (j.enCurso) return { clase: 'info', texto: 'Ejecutando' }
  if (!j.ultimaEjecucion) return { clase: 'neutral', texto: 'Esperando primer ciclo' }
  return { clase: 'ok', texto: 'Programada' }
}

function MonitoreoAdmin() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [auto, setAuto] = useState(true)
  const enCurso = useRef(false)

  const cargar = useCallback(() => {
    if (enCurso.current) return // nunca superponer peticiones
    enCurso.current = true
    setRefrescando(true)
    return api
      .get('/admin/monitoreo')
      .then(({ data }) => {
        setDatos(data)
        setError('')
      })
      .catch((err) => {
        const status = err.response?.status
        setError(
          status === 403 ? 'Esta sección es solo para administradores.'
            : !err.response ? 'No se pudo contactar al servidor. Puede estar caído o reiniciándose.'
              : 'No se pudo cargar el estado del sistema.'
        )
      })
      .finally(() => {
        enCurso.current = false
        setRefrescando(false)
        setCargando(false)
      })
  }, [])

  // Carga inicial diferida un tick: llama a `cargar` desde un callback,
  // nunca directo en el cuerpo del efecto.
  useEffect(() => {
    const t = setTimeout(cargar, 0)
    return () => clearTimeout(t)
  }, [cargar])

  // Refresco periódico: solo con auto-refresh activo y pestaña visible
  useEffect(() => {
    if (!auto) return undefined
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') cargar()
    }, INTERVALO_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [auto, cargar])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Consultando el estado del sistema...</p>
      </div>
    )
  }

  if (!datos) {
    return (
      <div className="mon-vacio">
        <ServerCrash size={36} strokeWidth={1.6} />
        <p>{error}</p>
        <button onClick={cargar} className="btn-primary">Reintentar</button>
      </div>
    )
  }

  const { nivel, alertas, servidor, baseDatos, negocio, jobs, trafico, rutasLentas, rutasMasUsadas, erroresRecientes } = datos
  const cfg = NIVEL[nivel] || NIVEL.warn
  const memPct = Math.min(100, Math.round((servidor.memoria.rssMb / servidor.memoria.limiteMb) * 100))
  const totalHttp = trafico.total || 1
  const envFaltantes = servidor.variablesEntorno.filter((v) => !v.definida)
  const flags = servidor.flagsCron || []

  return (
    <div className="mon">
      {/* ---------- Encabezado + semáforo ---------- */}
      <div className="section-header">
        <h2>Monitoreo</h2>
        <p className="section-description">Estado del servidor, la base de datos y las tareas automáticas</p>
      </div>

      <div className={`mon-banner mon-banner--${nivel}`}>
        <cfg.Icono size={28} strokeWidth={1.8} />
        <div className="mon-banner-texto">
          <strong>{cfg.label}</strong>
          <span>
            {alertas.length === 0
              ? 'No hay alertas activas.'
              : `${alertas.length} alerta${alertas.length === 1 ? '' : 's'} activa${alertas.length === 1 ? '' : 's'}.`}
            {' '}Actualizado {tiempoRelativo(datos.generadoEn)}
          </span>
        </div>
        <div className="mon-banner-acciones">
          <button
            className="mon-btn"
            onClick={() => setAuto((a) => !a)}
            title={auto ? 'Pausar actualización automática' : 'Reanudar actualización automática'}
          >
            {auto ? <Pause size={15} /> : <Play size={15} />}
            {auto ? 'Auto: 30 s' : 'Auto: pausado'}
          </button>
          <button className="mon-btn mon-btn--primario" onClick={cargar} disabled={refrescando}>
            <RefreshCw size={15} className={refrescando ? 'mon-girar' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error && <div className="mon-aviso-error">{error} Mostrando la última lectura disponible.</div>}

      {/* ---------- Alertas ---------- */}
      {alertas.length > 0 && (
        <section className="mon-card">
          <h3 className="mon-titulo"><AlertTriangle size={17} /> Alertas</h3>
          <ul className="mon-alertas">
            {alertas.map((a) => (
              <li key={a.id} className={`mon-alerta mon-alerta--${a.nivel}`}>
                {a.nivel === 'error' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                <div>
                  <strong>{a.titulo}</strong>
                  <p>{a.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- KPIs ---------- */}
      <div className="mon-kpis">
        <div className="mon-kpi">
          <span className="mon-kpi-icono"><Timer size={20} /></span>
          <div>
            <span className="mon-kpi-valor">{formatoUptime(servidor.uptimeSeg)}</span>
            <span className="mon-kpi-label">Encendido sin reiniciar</span>
          </div>
        </div>
        <div className="mon-kpi">
          <span className="mon-kpi-icono"><Cpu size={20} /></span>
          <div>
            <span className="mon-kpi-valor">{servidor.memoria.rssMb} MB</span>
            <span className="mon-kpi-label">Memoria de {servidor.memoria.limiteMb} MB</span>
            <div className="mon-barra"><i className={memPct > 85 ? 'mon-barra--alta' : ''} style={{ width: `${memPct}%` }} /></div>
          </div>
        </div>
        <div className="mon-kpi">
          <span className="mon-kpi-icono"><Database size={20} /></span>
          <div>
            <span className="mon-kpi-valor">{baseDatos.ok ? ms(baseDatos.latenciaPromedioMs) : 'Sin respuesta'}</span>
            <span className="mon-kpi-label">Latencia de base de datos</span>
          </div>
        </div>
        <div className="mon-kpi">
          <span className="mon-kpi-icono"><Gauge size={20} /></span>
          <div>
            <span className="mon-kpi-valor">{ms(trafico.p95Ms)}</span>
            <span className="mon-kpi-label">Respuesta API (p95) · {num(trafico.total)} peticiones</span>
          </div>
        </div>
      </div>

      <div className="mon-cols">
        {/* ---------- Tareas programadas ---------- */}
        <section className="mon-card">
          <h3 className="mon-titulo"><Clock size={17} /> Tareas automáticas</h3>
          <ul className="mon-lista">
            {jobs.map((j) => {
              const e = estadoJob(j)
              return (
                <li key={j.nombre} className="mon-fila">
                  <div className="mon-fila-principal">
                    <strong>{j.nombre}</strong>
                    <span className={`mon-pill mon-pill--${e.clase}`}>{e.texto}</span>
                  </div>
                  <p className="mon-fila-desc">{j.descripcion}</p>
                  <p className="mon-fila-meta">
                    {j.programado
                      ? <>Última ejecución: {tiempoRelativo(j.ultimaEjecucion)}
                        {j.ultimaDuracionMs != null && <> · {ms(j.ultimaDuracionMs)}</>}
                        {j.ejecuciones > 0 && <> · {j.ejecuciones} ejecución{j.ejecuciones === 1 ? '' : 'es'}</>}</>
                      : <>Apagada: define <code>{j.flagEnv || 'su env var'}=true</code> en Render para activarla</>}
                  </p>
                  {j.ultimoError && <p className="mon-fila-error">{j.ultimoError}</p>}
                </li>
              )
            })}
          </ul>
        </section>

        {/* ---------- Negocio ---------- */}
        <section className="mon-card">
          <h3 className="mon-titulo"><Activity size={17} /> Pendientes del negocio</h3>
          <ul className="mon-lista">
            <li className="mon-fila mon-fila--linea">
              <span>Órdenes sin atender (+{negocio.umbrales.horasOrdenSinAtender} h)</span>
              <strong className={negocio.ordenesSinAtender > 0 ? 'mon-num--warn' : ''}>{num(negocio.ordenesSinAtender)}</strong>
            </li>
            <li className="mon-fila mon-fila--linea">
              <span>Reportes de pago sin revisar (+{negocio.umbrales.horasReporteSinRevisar} h)</span>
              <strong className={negocio.reportesPagoSinRevisar > 0 ? 'mon-num--warn' : ''}>{num(negocio.reportesPagoSinRevisar)}</strong>
            </li>
            <li className="mon-fila mon-fila--linea">
              <span>Vencidas sin notificar al cliente</span>
              <strong className={negocio.vencidasSinNotificar > 0 ? 'mon-num--warn' : ''}>{num(negocio.vencidasSinNotificar)}</strong>
            </li>
            <li className="mon-fila mon-fila--linea">
              <span>Tasa de cambio</span>
              <strong>
                {negocio.tasa ? `${Number(negocio.tasa.valor).toFixed(2)} Bs` : '—'}
                {negocio.tasa && <small> · {tiempoRelativo(negocio.tasa.actualizadaEn)}</small>}
              </strong>
            </li>
          </ul>
        </section>
      </div>

      {/* ---------- Base de datos ---------- */}
      <section className="mon-card">
        <h3 className="mon-titulo"><Database size={17} /> Base de datos</h3>
        <div className="mon-tablas">
          {Object.entries(baseDatos.tablas).map(([tabla, r]) => (
            <div key={tabla} className={`mon-tabla ${r.error ? 'mon-tabla--error' : ''}`}>
              <span className="mon-tabla-nombre">{NOMBRES_TABLA[tabla] || tabla}</span>
              <span className="mon-tabla-valor">{r.error ? 'Error' : num(r.total)}</span>
              <span className="mon-tabla-ms">{r.ms} ms</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Tráfico ---------- */}
      <section className="mon-card">
        <h3 className="mon-titulo"><Server size={17} /> Tráfico de la API</h3>
        <p className="mon-nota">Desde el último reinicio del servidor ({tiempoRelativo(trafico.desde)}). No incluye este panel ni los chequeos de salud.</p>
        <div className="mon-clases">
          {['2xx', '3xx', '4xx', '5xx'].map((c) => (
            <div key={c} className="mon-clase">
              <div className="mon-clase-cab"><span>{c}</span><strong>{num(trafico.clases[c])}</strong></div>
              <div className="mon-barra"><i className={`mon-barra--${c}`} style={{ width: `${(trafico.clases[c] / totalHttp) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="mon-cols">
          <div>
            <h4 className="mon-subtitulo">Rutas más lentas (p95)</h4>
            {rutasLentas.length === 0
              ? <p className="mon-nota">Aún no hay suficientes datos (se necesitan 3+ peticiones por ruta).</p>
              : (
                <ul className="mon-rutas">
                  {rutasLentas.map((r) => (
                    <li key={r.ruta}><code>{r.ruta}</code><span>{ms(r.p95Ms)}</span></li>
                  ))}
                </ul>
              )}
          </div>
          <div>
            <h4 className="mon-subtitulo">Rutas más usadas</h4>
            {rutasMasUsadas.length === 0
              ? <p className="mon-nota">Sin tráfico registrado todavía.</p>
              : (
                <ul className="mon-rutas">
                  {rutasMasUsadas.map((r) => (
                    <li key={r.ruta}><code>{r.ruta}</code><span>{num(r.n)}</span></li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </section>

      {/* ---------- Errores recientes ---------- */}
      <section className="mon-card">
        <h3 className="mon-titulo"><XCircle size={17} /> Errores recientes (5xx)</h3>
        {erroresRecientes.length === 0
          ? <p className="mon-nota mon-nota--ok"><CheckCircle2 size={15} /> Sin errores de servidor desde el último reinicio.</p>
          : (
            <ul className="mon-rutas">
              {erroresRecientes.map((e, i) => (
                <li key={`${e.fecha}-${i}`}>
                  <code>{e.metodo} {e.ruta}</code>
                  <span>{e.status} · {e.ms} ms · {tiempoRelativo(e.fecha)}</span>
                </li>
              ))}
            </ul>
          )}
      </section>

      {/* ---------- Configuración ---------- */}
      <section className="mon-card">
        <h3 className="mon-titulo"><KeyRound size={17} /> Variables de entorno</h3>
        <p className="mon-nota">
          {envFaltantes.length === 0
            ? 'Todas las variables requeridas están definidas en el servidor (solo se verifica que existan; nunca se muestran sus valores).'
            : `Faltan ${envFaltantes.length} variable(s) por definir en Render.`}
        </p>
        <div className="mon-chips">
          {servidor.variablesEntorno.map((v) => (
            <span key={v.nombre} className={`mon-chip ${v.definida ? 'mon-chip--ok' : 'mon-chip--falta'}`}>
              {v.definida ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {v.nombre}
            </span>
          ))}
        </div>

        {flags.length > 0 && (
          <>
            <h4 className="mon-subtitulo"><Flag size={14} /> Tareas de negocio (interruptores)</h4>
            <p className="mon-nota">
              Estas tareas cambian el comportamiento con clientes reales, así que están apagadas por
              defecto. Prenderlas es decisión tuya, y{' '}
              <code>CRON_REVISAR_VENCIMIENTOS</code> exige antes el backfill de BD documentado en el
              AGENTS del backend.
            </p>
            <ul className="mon-lista">
              {flags.map((f) => (
                <li key={f.nombre} className="mon-fila mon-fila--linea">
                  <span>
                    <code>{f.nombre}</code>
                    <small className="mon-fila-sub">{f.descripcion}</small>
                  </span>
                  <span className={`mon-pill ${f.activa ? 'mon-pill--ok' : 'mon-pill--neutral'}`}>
                    {f.activa ? 'Activa' : 'Apagada'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mon-pie">
        Servidor Node {servidor.node} · entorno {servidor.entorno}. Las métricas de tráfico y tareas se
        guardan en memoria y se reinician cuando Render reinicia o duerme el servicio.
      </p>
    </div>
  )
}

export default MonitoreoAdmin
