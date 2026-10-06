import { useState, useEffect, useMemo } from 'react'
import { Stat } from '@chakra-ui/react'
import { FileText, Download, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import generarFacturaPDF from '../utils/generarFacturaPDF'
import { formatearUSD } from '../utils/formato'
import './EstadoCuenta.css'

// ---------------------------------------------------------------
// Historial de facturas — mismo tratamiento que PagosEstadoCuenta.jsx:
// LayoutPaginaPrincipal + clases .ec-* compartidas con EstadoCuenta.jsx.
//
// Nota: una factura individual no tiene "estado" propio (pagada/
// pendiente) en el modelo de datos — la deuda se calcula a nivel de
// cuenta completa (facturado - pagado), no factura por factura. Por
// eso el KPI de "deuda actual" viene del resumen general de la
// cuenta, no de contar facturas por estado — inventar un estado por
// factura acá sería mostrar algo que el backend no respalda.
// ---------------------------------------------------------------

function claveGrupoFecha(fecha) {
  const hoy = new Date()
  const d = new Date(fecha)
  const esMismoDia = (a, b) => a.toDateString() === b.toDateString()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (esMismoDia(d, hoy)) return 'Hoy'
  if (esMismoDia(d, ayer)) return 'Ayer'
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function FacturasEstadoCuenta() {
  const { user } = useAuth()
  const [facturas, setFacturas] = useState([])
  const [cliente, setCliente] = useState(null)
  const [deudaActual, setDeudaActual] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    api.get(`/clientes/${user.id}/estado-cuenta`)
      .then(({ data }) => {
        setFacturas(data.facturas || [])
        setCliente(data.cliente || null)
        setDeudaActual(data.resumen?.deuda_actual || 0)
      })
      .finally(() => setCargando(false))
  }, [user.id])

  const facturasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return facturas
    const termino = busqueda.trim().toLowerCase()
    return facturas.filter((f) =>
      `${f.numero_factura}`.toLowerCase().includes(termino) || `${f.monto_facturado}`.includes(termino)
    )
  }, [facturas, busqueda])

  const gruposPorFecha = useMemo(() => {
    const grupos = {}
    facturasFiltradas.forEach((f) => {
      const clave = claveGrupoFecha(f.created_at)
      if (!grupos[clave]) grupos[clave] = []
      grupos[clave].push(f)
    })
    return grupos
  }, [facturasFiltradas])

  const kpis = useMemo(() => {
    const total = facturas.reduce((sum, f) => sum + Number(f.monto_facturado), 0)
    return { total, cantidad: facturas.length }
  }, [facturas])

  async function exportarPDF(factura) {
    await generarFacturaPDF({ factura, cliente })
  }

  return (
    <LayoutPaginaPrincipal
      activo="facturas"
      titulo="Historial de facturas"
      subtitulo="Todas las facturas generadas para tu cuenta"
      nav={NAV_UNIFICADO}
    >
      <div className="ec-dashboard">
        {cargando ? (
          <div className="ec-estado-cargando">
            <p>Cargando facturas…</p>
          </div>
        ) : (
          <>
            <section className="ec-kpis">
              <Stat.Root className="ec-kpi">
                <Stat.Label className="ec-kpi__label">Total facturado</Stat.Label>
                <Stat.ValueText className="ec-kpi__valor">{formatearUSD(kpis.total)}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root className="ec-kpi">
                <Stat.Label className="ec-kpi__label">Facturas emitidas</Stat.Label>
                <Stat.ValueText className="ec-kpi__valor">{kpis.cantidad}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root className="ec-kpi">
                <Stat.Label className="ec-kpi__label">Deuda actual</Stat.Label>
                <Stat.ValueText className={`ec-kpi__valor ${deudaActual > 0 ? 'ec-kpi__valor--negativo' : ''}`}>
                  {formatearUSD(deudaActual)}
                </Stat.ValueText>
              </Stat.Root>
            </section>

            <section className="ec-movimientos">
              <div className="ec-movimientos__toolbar">
                <div className="ec-buscador">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por # o monto"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>

              {Object.keys(gruposPorFecha).length === 0 ? (
                <p className="ec-movimientos__vacio">Aún no tienes facturas generadas</p>
              ) : (
                Object.entries(gruposPorFecha).map(([fechaLabel, items]) => (
                  <div key={fechaLabel} className="ec-grupo-fecha">
                    <p className="ec-grupo-fecha__titulo">{fechaLabel}</p>
                    <ul className="ec-movimientos__lista">
                      {items.map((factura) => (
                        <li key={factura.id} className="ec-movimiento">
                          <div className="ec-movimiento__icono ec-movimiento__icono--factura">
                            <FileText size={18} />
                          </div>
                          <div className="ec-movimiento__info">
                            <span className="ec-movimiento__titulo">Factura #{factura.numero_factura}</span>
                            <span className="ec-badge ec-badge--registrado">emitida</span>
                          </div>
                          <strong className="ec-movimiento__monto ec-movimiento__monto--rojo">
                            {formatearUSD(factura.monto_facturado)}
                          </strong>
                          <button
                            className="ec-movimiento__descarga"
                            onClick={(e) => { e.stopPropagation(); exportarPDF(factura) }}
                            aria-label="Descargar PDF"
                          >
                            <Download size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}