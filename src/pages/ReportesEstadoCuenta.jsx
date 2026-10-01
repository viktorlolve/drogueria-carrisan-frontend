import { useState, useEffect, useMemo } from 'react'
import { Stat } from '@chakra-ui/react'
import { FileDown, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './EstadoCuenta.css'
import generarReporteEstadoCuentaPDF from '../utils/generarReporteEstadoCuentaPDF'


// ---------------------------------------------------------------
// Reportes — genera un PDF del estado de cuenta en un rango de
// fechas. Se agrega una vista previa en vivo (Stat de Chakra) que
// recalcula cuántas órdenes/facturas/pagos caen en el rango
// seleccionado ANTES de generar el PDF — los datos se piden una sola
// vez al entrar y todo el filtrado por fecha es client-side (mismo
// patrón que ya usaba el generador de PDF, solo que ahora también
// se refleja en pantalla, no solo dentro del PDF).
// ---------------------------------------------------------------

const HOY = new Date().toISOString().split('T')[0]
const HACE_30_DIAS = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export default function ReportesEstadoCuenta() {
  const { user } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [desde, setDesde] = useState(HACE_30_DIAS)
  const [hasta, setHasta] = useState(HOY)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/clientes/${user.id}/estado-cuenta`)
      .then(({ data }) => setDatos(data))
      .catch(() => setError('No se pudo cargar la información de tu cuenta'))
      .finally(() => setCargando(false))
  }, [user.id])

  const enRango = (fechaISO) => {
    const fecha = fechaISO.split('T')[0]
    return fecha >= desde && fecha <= hasta
  }

  const preview = useMemo(() => {
    if (!datos) return { ordenes: [], facturas: [], pagos: [] }
    return {
      ordenes: (datos.ordenes_pendientes || []).filter((o) => enRango(o.created_at)),
      facturas: (datos.facturas || []).filter((f) => enRango(f.created_at)),
      pagos: (datos.pagos || []).filter((p) => enRango(p.created_at)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, desde, hasta])

  async function generarReporte() {
  if (!datos) return
  setGenerando(true)
  setError('')
  try {
    await generarReporteEstadoCuentaPDF({
      cliente: datos.cliente,
      resumen: datos.resumen,
      facturas: preview.facturas,
      pagos: preview.pagos,
      ordenes: preview.ordenes,
      vencimientos: datos.ordenes_pendientes || [],
      desde,
      hasta,
    })
  } catch (err) {
    setError('No se pudo generar el reporte')
    console.error(err)
  } finally {
    setGenerando(false)
  }
}

  return (
    <LayoutPaginaPrincipal
      activo="reportes"
      titulo="Reportes"
      subtitulo="Generá un PDF de tu estado de cuenta por período"
      nav={NAV_UNIFICADO}
    >
      <div className="ec-dashboard">
        {cargando ? (
          <div className="ec-estado-cargando">
            <p>Cargando…</p>
          </div>
        ) : (
          <>
            <section className="ec-reporte-form">
              <div className="ec-reporte-form__fechas">
                <label className="ec-reporte-form__campo">
                  Desde
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} max={hasta} />
                </label>
                <label className="ec-reporte-form__campo">
                  Hasta
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} min={desde} max={HOY} />
                </label>
              </div>

              {error && (
                <div className="ec-alerta-error">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button className="ec-reporte-form__generar" onClick={generarReporte} disabled={generando}>
                <FileDown size={18} />
                {generando ? 'Generando…' : 'Generar PDF'}
              </button>
            </section>

            {/* Vista previa en vivo del período — se recalcula al vuelo
                a medida que se cambian las fechas, antes de generar nada */}
            <section className="ec-reporte-preview">
              <p className="ec-reporte-preview__titulo">Vista previa del período</p>
              <div className="ec-reporte-preview__grid">
                <Stat.Root className="ec-reporte-preview__item">
                  <Stat.Label className="ec-kpi__label">Órdenes</Stat.Label>
                  <Stat.ValueText className="ec-kpi__valor">{preview.ordenes.length}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root className="ec-reporte-preview__item">
                  <Stat.Label className="ec-kpi__label">Facturas</Stat.Label>
                  <Stat.ValueText className="ec-kpi__valor">{preview.facturas.length}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root className="ec-reporte-preview__item">
                  <Stat.Label className="ec-kpi__label">Pagos</Stat.Label>
                  <Stat.ValueText className="ec-kpi__valor">{preview.pagos.length}</Stat.ValueText>
                </Stat.Root>
              </div>
            </section>
          </>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}