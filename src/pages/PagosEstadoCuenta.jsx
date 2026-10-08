import { useState, useEffect, useMemo } from 'react'
import { Banknote, CalendarClock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import HistorialBancario from '../components/estado-cuenta/HistorialBancario'
import PagoClienteModal from '../components/PagoClienteModal'
import generarComprobantePagoPDF from '../utils/generarComprobantePagoPDF'
import { formatearFechaCorta } from '../utils/formato'

// ---------------------------------------------------------------
// Historial de pagos — interfaz estilo banca en línea.
// La UI vive en HistorialBancario (compartida con FacturasEstadoCuenta);
// acá solo se cargan y normalizan los datos.
// ---------------------------------------------------------------

// Los pagos del historial ya pasaron verificación (PagoClienteModal los
// presenta como "Pago verificado"), así que ese es el estado por defecto.
const ESTADOS_PAGO = {
  verificado: { label: 'Verificado', tono: 'ok' },
  registrado: { label: 'Registrado', tono: 'neutro' },
}

function chipDePago(estado) {
  const clave = estado || 'verificado'
  return (
    ESTADOS_PAGO[clave] || {
      label: String(clave).charAt(0).toUpperCase() + String(clave).slice(1),
      tono: 'neutro',
    }
  )
}

export default function PagosEstadoCuenta() {
  const { user } = useAuth()
  const [pagos, setPagos] = useState([])
  const [cliente, setCliente] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data } = await api.get(`/clientes/${user.id}/estado-cuenta`)
        if (cancelado) return
        setPagos(data.pagos || [])
        setCliente(data.cliente || null)
        setFacturas(data.facturas || [])
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
      pagos.map((p) => ({
        key: `pago-${p.id}`,
        raw: p,
        fecha: p.created_at,
        titulo: `Pago #${p.id}`,
        extra: null,
        monto: Number(p.monto || 0),
        chip: chipDePago(p.estado),
        textoBusqueda: `pago ${p.id} ${p.monto}`.toLowerCase(),
      })),
    [pagos]
  )

  const ultimoPago = useMemo(() => {
    const fechas = pagos.map((p) => p.created_at).filter(Boolean).sort()
    return fechas.length ? fechas[fechas.length - 1] : null
  }, [pagos])

  return (
    <LayoutPaginaPrincipal
      activo="pagos-ec"
      titulo="Historial de pagos"
      subtitulo="Todos los pagos registrados en tu cuenta"
      nav={NAV_UNIFICADO}
    >
      <HistorialBancario
        tipo="pago"
        items={items}
        cargando={cargando}
        error={error}
        onReintentar={reintentar}
        hero={{
          etiqueta: 'Total pagado',
          Icono: Banknote,
          singular: 'pago',
          plural: 'pagos',
          listaLabel: 'Pagos',
          errorTitulo: 'No pudimos cargar tus pagos',
          extras: ultimoPago
            ? [{ Icono: CalendarClock, texto: `Último pago: ${formatearFechaCorta(ultimoPago)}` }]
            : [],
          cta: { to: '/pagos', label: 'Reportar pago' },
        }}
        vacio={{
          titulo: 'Aún no tienes pagos registrados',
          texto: 'Tus pagos aparecerán aquí una vez que los verifiquemos.',
          cta: { to: '/pagos', label: 'Reportar un pago' },
        }}
        onAbrir={setPagoSeleccionado}
        onDescargar={(pago) => generarComprobantePagoPDF({ pago, cliente, facturas })}
      />

      {pagoSeleccionado && (
        <PagoClienteModal
          pago={pagoSeleccionado}
          cliente={cliente}
          facturas={facturas}
          onClose={() => setPagoSeleccionado(null)}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}
