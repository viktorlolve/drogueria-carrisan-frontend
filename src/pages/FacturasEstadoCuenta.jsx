import { useState, useEffect, useMemo } from 'react'
import { Receipt, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import HistorialBancario from '../components/estado-cuenta/HistorialBancario'
import FacturaClienteModal from '../components/FacturaClienteModal'
import generarFacturaPDF from '../utils/generarFacturaPDF'

// ---------------------------------------------------------------
// Historial de facturas — interfaz estilo banca en línea.
// La UI vive en HistorialBancario (compartida con PagosEstadoCuenta);
// acá solo se cargan y normalizan los datos.
//
// Nota: una factura individual no tiene "estado" propio (pagada/pendiente)
// en el modelo de datos — la deuda se calcula a nivel de cuenta completa
// (facturado - pagado), no factura por factura. Por eso el dato de "deuda
// actual" viene del resumen general de la cuenta y todas las facturas
// muestran "Emitida": inventar un estado por factura sería mostrar algo
// que el backend no respalda.
// ---------------------------------------------------------------

export default function FacturasEstadoCuenta() {
  const { user } = useAuth()
  const [facturas, setFacturas] = useState([])
  const [cliente, setCliente] = useState(null)
  const [deudaActual, setDeudaActual] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data } = await api.get(`/clientes/${user.id}/estado-cuenta`)
        if (cancelado) return
        setFacturas(data.facturas || [])
        setCliente(data.cliente || null)
        setDeudaActual(data.resumen?.deuda_actual || 0)
      } catch (err) {
        console.error(err)
        if (!cancelado) setError(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [user.id, intento])

  function reintentar() {
    setError(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  const items = useMemo(
    () =>
      facturas.map((f) => {
        const ordenes = (f.factura_ordenes || []).map((fo) => fo.orden_id).filter(Boolean)
        return {
          key: `factura-${f.id}`,
          raw: f,
          fecha: f.created_at,
          titulo: `Factura #${f.numero_factura}`,
          extra: ordenes.length === 1 ? `Orden #${ordenes[0]}` : ordenes.length > 1 ? `${ordenes.length} órdenes` : null,
          monto: Number(f.monto_facturado || 0),
          chip: { label: 'Emitida', tono: 'info' },
          textoBusqueda: `factura ${f.numero_factura} ${f.monto_facturado} ${ordenes.map((id) => `#${id}`).join(' ')}`.toLowerCase(),
        }
      }),
    [facturas]
  )

  return (
    <LayoutPaginaPrincipal
      activo="facturas"
      titulo="Historial de facturas"
      subtitulo="Todas las facturas generadas para tu cuenta"
      nav={NAV_UNIFICADO}
    >
      <HistorialBancario
        tipo="factura"
        items={items}
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
        hero={{
          etiqueta: 'Total facturado',
          Icono: Receipt,
          singular: 'factura',
          plural: 'facturas',
          listaLabel: 'Facturas',
          errorTitulo: 'No pudimos cargar tus facturas',
          extras: [{ Icono: Wallet, texto: 'Deuda actual', valor: deudaActual, alerta: deudaActual > 0 }],
        }}
        vacio={{
          titulo: 'Aún no tienes facturas',
          texto: 'Cuando se facture una de tus órdenes, aparecerá aquí.',
        }}
        onAbrir={setFacturaSeleccionada}
        onDescargar={(factura) => generarFacturaPDF({ factura, cliente })}
      />

      {facturaSeleccionada && (
        <FacturaClienteModal
          factura={facturaSeleccionada}
          cliente={cliente}
          onClose={() => setFacturaSeleccionada(null)}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}