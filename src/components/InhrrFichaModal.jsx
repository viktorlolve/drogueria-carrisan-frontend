import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  X,
  Factory,
  Pill,
  FlaskConical,
  Building2,
  Handshake,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ArrowRight,
  RotateCw,
} from 'lucide-react'
import api from '../api/axios'
import { COLOR_CATEGORIA, nombreCategoria, formatFecha, estadoRegistro } from '../utils/inhrr'
import { ICONO_CATEGORIA, ICONO_ESTADO } from '../utils/iconosConsulta'
import '../pages/RegistroInhrr.css'

function Dato({ icono: Icono, etiqueta, children }) {
  return (
    <div className="cs-ficha__dato">
      <span className="cs-ficha__dato-icono" aria-hidden="true">
        <Icono size={16} />
      </span>
      <div>
        <dt>{etiqueta}</dt>
        <dd>{children || '—'}</dd>
      </div>
    </div>
  )
}

function InhrrFichaModal({ fichaSku, onClose }) {
  const [ficha, setFicha] = useState(null)
  const [carga, setCarga] = useState('cargando') // cargando | ok | error
  const [intento, setIntento] = useState(0)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Carga (reinicia el estado al cambiar de SKU o al reintentar)
  useEffect(() => {
    if (!fichaSku) return
    let activo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarga('cargando')
    setFicha(null)
    api
      .get(`/catalogo/${encodeURIComponent(fichaSku)}`)
      .then(({ data }) => {
        if (!activo) return
        setFicha(data)
        setCarga('ok')
      })
      .catch((err) => {
        console.error('Error al cargar la ficha INHRR:', err)
        if (activo) setCarga('error')
      })
    return () => {
      activo = false
    }
  }, [fichaSku, intento])

  // Esc para cerrar + bloqueo de scroll del fondo
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previo
    }
  }, [])

  const estado = ficha ? estadoRegistro(ficha) : null
  const IconoCat = ficha ? ICONO_CATEGORIA[ficha.categoria] || ICONO_CATEGORIA.MI : null
  const IconoEstado = estado ? ICONO_ESTADO[estado.clave] : null
  const moleculas = ficha?.moleculas || []

  return createPortal(
    <div className="cs-ficha-wrap">
      <div className="cs-ficha-overlay" onClick={onClose} />
      <div className="cs-ficha" role="dialog" aria-modal="true" aria-label="Ficha del registro sanitario">
        <button type="button" className="cs-ficha__close" aria-label="Cerrar ficha" onClick={onClose}>
          <X size={18} />
        </button>

        {carga === 'cargando' && (
          <div className="cs-ficha__estado">
            <div className="cs-spinner" aria-hidden="true" />
            <p>Cargando ficha…</p>
          </div>
        )}

        {carga === 'error' && (
          <div className="cs-ficha__estado">
            <p>No pudimos cargar esta ficha. Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="cs-boton cs-boton--primario" onClick={() => setIntento((n) => n + 1)}>
              <RotateCw size={16} /> Reintentar
            </button>
          </div>
        )}

        {carga === 'ok' && ficha && (
          <>
            <header className="cs-ficha__head" style={{ '--cat': COLOR_CATEGORIA[ficha.categoria] || '#6B7280' }}>
              <div className="cs-ficha__badges">
                <span className="cs-tag cs-tag--claro">
                  <IconoCat size={13} /> {nombreCategoria(ficha.categoria)}
                </span>
                <span className={`cs-estado cs-estado--${estado.clave} cs-estado--sobre-oscuro`}>
                  <IconoEstado size={13} /> {estado.etiqueta}
                </span>
              </div>
              <h2 className="cs-ficha__nombre">{ficha.nombre}</h2>
              <p className="cs-ficha__reg">
                Registro sanitario <strong>{ficha.ef || '—'}</strong>
                <span aria-hidden="true"> · </span>
                <span className="cs-ficha__sku">{ficha.sku}</span>
              </p>
            </header>

            <div className="cs-ficha__cuerpo">
              <section>
                <h3 className="cs-ficha__titulo">Datos del registro</h3>
                <dl className="cs-ficha__grid">
                  <Dato icono={Pill} etiqueta="Forma farmacéutica">
                    {ficha.forma}
                  </Dato>
                  <Dato icono={FlaskConical} etiqueta="Principio activo">
                    {ficha.principio_activo}
                  </Dato>
                  <Dato icono={Factory} etiqueta="Laboratorio">
                    {ficha.laboratorio}
                  </Dato>
                  {ficha.fabricante && (
                    <Dato icono={Building2} etiqueta="Fabricante">
                      {ficha.fabricante}
                    </Dato>
                  )}
                  {ficha.patrocinante && (
                    <Dato icono={BadgeCheck} etiqueta="Patrocinante">
                      {ficha.patrocinante}
                    </Dato>
                  )}
                  {ficha.representante && (
                    <Dato icono={Handshake} etiqueta="Representante">
                      {ficha.representante}
                      {ficha.rif_representante ? ` · RIF ${ficha.rif_representante}` : ''}
                    </Dato>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="cs-ficha__titulo">Vigencia</h3>
                <div className="cs-linea">
                  <div className="cs-linea__paso">
                    <CalendarCheck size={16} aria-hidden="true" />
                    <span>Aprobado</span>
                    <strong>{formatFecha(ficha.fecha_aprobado)}</strong>
                  </div>
                  <div className="cs-linea__paso">
                    <CalendarClock size={16} aria-hidden="true" />
                    <span>Vigente hasta</span>
                    <strong>{formatFecha(ficha.fecha_vigencia)}</strong>
                  </div>
                  <div className="cs-linea__paso">
                    <CalendarX size={16} aria-hidden="true" />
                    <span>Cancelado</span>
                    <strong>{ficha.fecha_cancelado ? formatFecha(ficha.fecha_cancelado) : 'No'}</strong>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="cs-ficha__titulo">Moléculas y clasificación ATC</h3>
                {moleculas.length > 0 ? (
                  <div className="cs-ficha__mols">
                    {moleculas.map((m, i) =>
                      m.id ? (
                        <Link
                          key={m.id}
                          to={`/vademecum/${m.id}`}
                          className="cs-molcard"
                          onClick={onClose}
                        >
                          <span className="cs-molcard__icono" aria-hidden="true">
                            <FlaskConical size={18} />
                          </span>
                          <span className="cs-molcard__texto">
                            <strong>{m.nombre}</strong>
                            {m.atc && <em>ATC {m.atc}</em>}
                          </span>
                          <span className="cs-molcard__cta">
                            Ver ficha clínica <ArrowRight size={14} />
                          </span>
                        </Link>
                      ) : (
                        <span key={m.nombre || i} className="cs-molcard cs-molcard--sin-enlace">
                          <span className="cs-molcard__icono" aria-hidden="true">
                            <FlaskConical size={18} />
                          </span>
                          <span className="cs-molcard__texto">
                            <strong>{m.nombre}</strong>
                          </span>
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p className="cs-vacio">Este registro aún no tiene molécula enlazada.</p>
                )}
              </section>

              <p className="cs-nota">
                Fuente: Registro sanitario del INHRR (Instituto Nacional de Higiene «Rafael Rangel»).
                Consulta informativa; no sustituye el empaque ni la información oficial del producto.
              </p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default InhrrFichaModal