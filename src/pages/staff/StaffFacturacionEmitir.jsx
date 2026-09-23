import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import { tipoDocumento } from './staffFacturacionConfig'
import './StaffOrdenes.css'
import './StaffFinanzas.css'

function formatUSD(valor) {
  return Number(valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TIPOS_DOC = [
  { id: 'factura', texto: 'Factura' },
  { id: 'recibo_cobro', texto: 'Recibo de cobro' },
  { id: 'nota_credito', texto: 'Nota de crédito' },
  { id: 'nota_debito', texto: 'Nota de débito' },
]

export default function TabEmitir() {
  const [tipo, setTipo] = useState('factura')

  // buscador de cliente (patrón StaffOrdenes)
  const [cliente, setCliente] = useState(null)
  const [queryCliente, setQueryCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const debounceCliente = useRef(null)

  // datos del documento
  const [numero, setNumero] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [seleccionadas, setSeleccionadas] = useState([])
  const [tasa, setTasa] = useState(null)
  const [monto, setMonto] = useState('')
  const [facturasCliente, setFacturasCliente] = useState([])
  const [facturaRef, setFacturaRef] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Búsqueda de clientes (backend: GET /staff/clientes?buscar=)
  useEffect(() => {
    if (debounceCliente.current) clearTimeout(debounceCliente.current)
    if (queryCliente.trim().length < 2) return
    debounceCliente.current = setTimeout(async () => {
      setBuscandoClientes(true)
      try {
        const { data } = await staffApi.get('/staff/clientes', {
          params: { buscar: queryCliente.trim() },
        })
        setResultadosClientes(data?.clientes || data || [])
      } catch (err) {
        console.error('Error buscando clientes', err)
        setResultadosClientes([])
      } finally {
        setBuscandoClientes(false)
      }
    }, 300)
    return () => clearTimeout(debounceCliente.current)
  }, [queryCliente])

  // Al cambiar tipo o cliente: siguiente número + dato específico del tipo
  useEffect(() => {
    let activo = true

    staffApi
      .get('/staff/contabilidad/facturas/siguiente', { params: { tipo } })
      .then(({ data }) => { if (activo) setNumero(data.numero) })
      .catch(() => {})

    if (tipo === 'factura' || tipo === 'recibo_cobro') {
      if (cliente) {
        staffApi
          .get(`/staff/contabilidad/clientes/${cliente.id}/sin-facturar`, { params: { solo_pagadas: 1 } })
          .then(({ data }) => { if (activo) setOrdenes(data || []) })
          .catch(() => { if (activo) setOrdenes([]) })
      }
      staffApi
        .get('/prices')
        .then(({ data }) => { if (activo) setTasa(data) })
        .catch(() => { if (activo) setTasa(null) })
    } else {
      if (cliente) {
        staffApi
          .get('/staff/contabilidad/facturas')
          .then(({ data }) => {
            if (!activo) return
            setFacturasCliente(
              (data || []).filter((f) => f.tipo === 'factura' && f.usuario_id === cliente.id && !f.anulada)
            )
          })
          .catch(() => { if (activo) setFacturasCliente([]) })
      }
    }

    return () => { activo = false }
  }, [tipo, cliente])

  const clientesVisibles = queryCliente.trim().length < 2 ? [] : resultadosClientes

  function seleccionarCliente(c) {
    setCliente(c)
    setQueryCliente('')
    setResultadosClientes([])
    setSeleccionadas([])
  }

  function toggleOrden(ordenId) {
    setSeleccionadas((prev) =>
      prev.includes(ordenId) ? prev.filter((id) => id !== ordenId) : [...prev, ordenId]
    )
  }

  const esReflejo = tipo === 'factura' || tipo === 'recibo_cobro'
  const ordenesVisibles = cliente && esReflejo ? ordenes : []
  const tasaVisibles = esReflejo ? tasa : null
  const facturasVisibles = cliente && !esReflejo ? facturasCliente : []
  const totalUSD = ordenesVisibles
    .filter((o) => seleccionadas.includes(o.id))
    .reduce((sum, o) => sum + Number(o.total_usd), 0)
  const bolivares = tasaVisibles ? totalUSD * Number(tasaVisibles.usd_a_ves) : null

  async function emitir() {
    setError('')
    setExito('')
    if (!cliente) { setError('Elige un cliente'); return }
    if (!numero.trim()) { setError('El número es obligatorio'); return }

    const payload = { usuario_id: cliente.id, numero_factura: numero.trim(), tipo }

    if (esReflejo) {
      if (seleccionadas.length === 0) { setError('Selecciona al menos una orden'); return }
      payload.orden_ids = seleccionadas
    } else {
      if (!monto || Number(monto) <= 0) { setError('El monto debe ser mayor a 0'); return }
      payload.monto_facturado = Number(monto)
      if (facturaRef) payload.factura_referencia_id = Number(facturaRef)
      if (motivo.trim()) payload.motivo = motivo.trim()
    }
    if (nota.trim()) payload.nota = nota.trim()

    setGuardando(true)
    try {
      const { data } = await staffApi.post('/staff/contabilidad/facturas', payload)
      setExito(`${tipoDocumento(data.tipo)} #${data.numero_factura} emitida por $${formatUSD(data.monto_facturado)} (Bs ${formatUSD(data.monto_bs || 0)})`)
      setSeleccionadas([])
      setMonto('')
      setMotivo('')
      setNota('')
      setFacturaRef('')
      const { data: sig } = await staffApi.get('/staff/contabilidad/facturas/siguiente', { params: { tipo } })
      setNumero(sig.numero)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo emitir el documento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <h3 className="stf-subtitulo">Tipo de documento</h3>
      <div className="stf-form-row">
        {TIPOS_DOC.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`stf-btn ${tipo === t.id ? 'stf-btn--primary' : ''}`}
            onClick={() => { setTipo(t.id); setSeleccionadas([]) }}
          >
            {t.texto}
          </button>
        ))}
      </div>

      {!cliente ? (
        <div className="so-step" style={{ marginTop: 12 }}>
          <p className="so-step-label">Cliente</p>
          <div className="so-buscador">
            <Search size={17} />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, correo o RIF..."
              value={queryCliente}
              onChange={(e) => setQueryCliente(e.target.value)}
              autoFocus
            />
          </div>

          {buscandoClientes && <p className="so-aviso">Buscando...</p>}
          {!buscandoClientes && queryCliente.trim().length >= 2 && clientesVisibles.length === 0 && (
            <p className="so-aviso">Sin clientes que coincidan</p>
          )}

          <div className="so-lista">
            {clientesVisibles.map((c) => (
              <button key={c.id} type="button" className="so-item" onClick={() => seleccionarCliente(c)}>
                <span className="so-avatar">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                <span className="so-item-info">
                  <span className="so-item-nombre">{c.nombre || 'Sin nombre'}</span>
                  <span className="so-item-sub">{c.email}{c.rif_cedula ? ` · ${c.rif_cedula}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="so-cliente-activo">
            <span>Cliente: <strong>{cliente.nombre || cliente.email}</strong></span>
            <button type="button" onClick={() => { setCliente(null); setSeleccionadas([]) }}>Cambiar</button>
          </div>

          <div className="stf-form-row" style={{ marginTop: 12 }}>
            <input
              className="stf-input"
              placeholder="N° del documento"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
            />
            <input
              className="stf-input"
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {esReflejo ? (
            <>
              <h3 className="stf-subtitulo">Ordenes pagadas facturables</h3>
              {ordenesVisibles.length === 0 ? (
                <p className="so-aviso">Este cliente no tiene órdenes pagadas pendientes de facturar.</p>
              ) : (
                <div className="stf-tabla-wrap">
                  <table className="stf-tabla">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Orden</th>
                        <th>Fecha</th>
                        <th>Total US$</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesVisibles.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={seleccionadas.includes(o.id)}
                              onChange={() => toggleOrden(o.id)}
                            />
                          </td>
                          <td>#{o.id}</td>
                          <td>{formatFecha(o.created_at)}</td>
                          <td>${formatUSD(o.total_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="stf-subtitulo">
                Total: ${formatUSD(totalUSD)}
                {tasaVisibles && `  ·  Bs ${formatUSD(bolivares)} (tasa ${Number(tasaVisibles.usd_a_ves).toFixed(4)})`}
              </p>
            </>
          ) : (
            <>
              <div className="stf-form-row" style={{ marginTop: 12 }}>
                <input
                  className="stf-input"
                  placeholder="Monto ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
                <select
                  className="stf-input"
                  value={facturaRef}
                  onChange={(e) => setFacturaRef(e.target.value)}
                >
                  <option value="">Sin factura de referencia</option>
                  {facturasVisibles.map((f) => (
                    <option key={f.id} value={f.id}>
                      #{f.numero_factura} · ${formatUSD(f.monto_facturado)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="stf-form-row" style={{ marginTop: 10 }}>
                <input
                  className="stf-input"
                  placeholder="Motivo (devolución, ajuste, cobro de servicio…)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            </>
          )}

          {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}
          {exito && <p style={{ color: '#065F46', marginTop: 8 }}>{exito}</p>}

          <div style={{ marginTop: 16 }}>
            <button className="stf-btn stf-btn--primary" type="button" onClick={emitir} disabled={guardando}>
              {guardando ? 'Emitiendo...' : `Emitir ${tipoDocumento(tipo)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}