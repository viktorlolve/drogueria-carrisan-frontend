import { useState, useEffect, useMemo } from 'react'
import { Stat } from '@chakra-ui/react'
import { DollarSign, Download, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import PagoClienteModal from '../components/PagoClienteModal'
import generarComprobantePagoPDF from '../utils/generarComprobantePagoPDF'
import './EstadoCuenta.css'

// ---------------------------------------------------------------
// Historial de pagos — mismo tratamiento que FacturasEstadoCuenta.jsx:
// LayoutPaginaPrincipal + clases .ec-* compartidas con EstadoCuenta.jsx.
// ---------------------------------------------------------------

function formatUSD(valor) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor || 0)
}

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

export default function PagosEstadoCuenta() {
  const { user } = useAuth()
  const [pagos, setPagos] = useState([])
  const [cliente, setCliente] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)

  useEffect(() => {
    api.get(`/clientes/${user.id}/estado-cuenta`)
      .then(({ data }) => {
        setPagos(data.pagos || [])
        setCliente(data.cliente || null)
        setFacturas(data.facturas || [])
      })
      .finally(() => setCargando(false))
  }, [user.id])

  const pagosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pagos
    const termino = busqueda.trim().toLowerCase()
    return pagos.filter((p) =>
      `${p.id}`.toLowerCase().includes(termino) || `${p.monto}`.includes(termino)
    )
  }, [pagos, busqueda])

  const gruposPorFecha = useMemo(() => {
    const grupos = {}
    pagosFiltrados.forEach((p) => {
      const clave = claveGrupoFecha(p.created_at)
      if (!grupos[clave]) grupos[clave] = []
      grupos[clave].push(p)
    })
    return grupos
  }, [pagosFiltrados])

  const kpis = useMemo(() => {
    const total = pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    return { total, cantidad: pagos.length }
  }, [pagos])

  async function exportarPDF(pago) {
    await generarComprobantePagoPDF({ pago, cliente, facturas })
  }

  return (
    <LayoutPaginaPrincipal
      activo="pagos-ec"
      titulo="Historial de pagos"
      subtitulo="Todos los pagos registrados en tu cuenta"
      nav={NAV_UNIFICADO}
    >
      <div className="ec-dashboard">
        {cargando ? (
          <div className="ec-estado-cargando">
            <p>Cargando pagos…</p>
          </div>
        ) : (
          <>
            <section className="ec-kpis">
              <Stat.Root className="ec-kpi">
                <Stat.Label className="ec-kpi__label">Total pagado</Stat.Label>
                <Stat.ValueText className="ec-kpi__valor">{formatUSD(kpis.total)}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root className="ec-kpi">
                <Stat.Label className="ec-kpi__label">Pagos registrados</Stat.Label>
                <Stat.ValueText className="ec-kpi__valor">{kpis.cantidad}</Stat.ValueText>
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
                <p className="ec-movimientos__vacio">Aún no tienes pagos registrados</p>
              ) : (
                Object.entries(gruposPorFecha).map(([fechaLabel, items]) => (
                  <div key={fechaLabel} className="ec-grupo-fecha">
                    <p className="ec-grupo-fecha__titulo">{fechaLabel}</p>
                    <ul className="ec-movimientos__lista">
                      {items.map((pago) => (
                        <li
                          key={pago.id}
                          className="ec-movimiento"
                          onClick={() => setPagoSeleccionado(pago)}
                        >
                          <div className="ec-movimiento__icono ec-movimiento__icono--pago">
                            <DollarSign size={18} />
                          </div>
                          <div className="ec-movimiento__info">
                            <span className="ec-movimiento__titulo">Pago #{pago.id}</span>
                            <span className="ec-badge ec-badge--registrado">registrado</span>
                          </div>
                          <strong className="ec-movimiento__monto ec-movimiento__monto--verde">
                            +{formatUSD(pago.monto)}
                          </strong>
                          <button
                            className="ec-movimiento__descarga"
                            onClick={(e) => { e.stopPropagation(); exportarPDF(pago) }}
                            aria-label="Descargar comprobante"
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

      {pagoSeleccionado && (
        <PagoClienteModal pago={pagoSeleccionado} cliente={cliente} facturas={facturas} onClose={() => setPagoSeleccionado(null)} />
      )}
    </LayoutPaginaPrincipal>
  )
}
