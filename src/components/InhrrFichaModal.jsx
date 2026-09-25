import { useState, useEffect } from 'react'
import api from '../api/axios'
import { COLOR_CATEGORIA, nombreCategoria, formatFecha } from '../utils/inhrr'
import '../pages/RegistroInhrr.css'

function InhrrFichaModal({ fichaSku, onClose }) {
  const [ficha, setFicha] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!fichaSku) return
    let activo = true
    api
      .get(`/catalogo/${encodeURIComponent(fichaSku)}`)
      .then(({ data }) => activo && setFicha(data))
      .catch((err) => console.error('Error al cargar la ficha INHRR:', err))
      .finally(() => activo && setCargando(false))
    return () => { activo = false }
  }, [fichaSku])

  return (
    <>
      <div className="inhrr-ficha-overlay" onClick={onClose} />
      <div className="inhrr-ficha" role="dialog" aria-modal="true">
        <button type="button" className="inhrr-ficha__close" aria-label="Cerrar ficha" onClick={onClose}>
          ✕
        </button>
        {cargando || !ficha ? (
          <div className="inhrr-ficha__cargando">Cargando ficha…</div>
        ) : (
          <div className="inhrr-ficha__content">
            <div className="inhrr-ficha__header">
              <span
                className="inhrr-card__cat"
                style={{ background: COLOR_CATEGORIA[ficha.categoria] || '#6B7280' }}
              >
                {ficha.categoria} · {nombreCategoria(ficha.categoria)}
              </span>
              <span className="inhrr-card__sku">{ficha.sku}</span>
            </div>
            <h2 className="inhrr-ficha__nombre">{ficha.nombre}</h2>

            <dl className="inhrr-ficha__grid">
              <div className="inhrr-ficha__item">
                <dt>Registro sanitario</dt>
                <dd>{ficha.ef || '—'}</dd>
              </div>
              <div className="inhrr-ficha__item">
                <dt>Forma farmacéutica</dt>
                <dd>{ficha.forma || '—'}</dd>
              </div>
              <div className="inhrr-ficha__item">
                <dt>Principio activo</dt>
                <dd>{ficha.principio_activo || '—'}</dd>
              </div>
              <div className="inhrr-ficha__item">
                <dt>Laboratorio</dt>
                <dd>{ficha.laboratorio || '—'}</dd>
              </div>
              {ficha.representante && (
                <div className="inhrr-ficha__item">
                  <dt>Representante</dt>
                  <dd>
                    {ficha.representante}
                    {ficha.rif_representante ? ` · RIF ${ficha.rif_representante}` : ''}
                  </dd>
                </div>
              )}
              {ficha.patrocinante && (
                <div className="inhrr-ficha__item">
                  <dt>Patrocinante</dt>
                  <dd>{ficha.patrocinante}</dd>
                </div>
              )}
              {ficha.fabricante && (
                <div className="inhrr-ficha__item">
                  <dt>Fabricante</dt>
                  <dd>{ficha.fabricante}</dd>
                </div>
              )}
              <div className="inhrr-ficha__item">
                <dt>Fecha aprobado</dt>
                <dd>{formatFecha(ficha.fecha_aprobado)}</dd>
              </div>
              <div className="inhrr-ficha__item">
                <dt>Vigencia</dt>
                <dd>{formatFecha(ficha.fecha_vigencia)}</dd>
              </div>
              <div className="inhrr-ficha__item">
                <dt>Cancelado</dt>
                <dd>{ficha.fecha_cancelado ? formatFecha(ficha.fecha_cancelado) : 'No'}</dd>
              </div>
            </dl>

            <div className="inhrr-ficha__mols">
              <h3>Moléculas / ATC</h3>
              {ficha.moleculas?.length > 0 ? (
                <div className="inhrr-mol-chips">
                  {ficha.moleculas.map((m) => (
                    <span key={m.id} className="inhrr-mol-chip">
                      {m.nombre}
                      {m.atc ? ` · ${m.atc}` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="filtro-vacio">Este registro aún no tiene molécula enlazada.</p>
              )}
            </div>

            <p className="inhrr-ficha__nota">
              Fuente: Registro sanitario del INHRR (Instituto Nacional de Higiene «Rafael Rangel»).
              Consulta informativa; no sustituye el empaque ni la información oficial del producto.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default InhrrFichaModal