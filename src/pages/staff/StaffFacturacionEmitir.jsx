import { useEffect, useState } from 'react'
import staffApi from '../../api/staffAxios'
import { tipoDocumento } from './staffFacturacionConfig'
import './StaffOrdenes.css'
import './StaffFinanzas.css'
import { formatearUSD, formatearVES } from '../../utils/formato'

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

// Panel de emisión de un cliente: muestra lo que se va a cerrar (órdenes
// pendientes para factura/recibo, o los datos de la nota) y la barra de emitir.
export default function PanelEmitir({ cliente, tasa, onEmitido }) {
  const [tipo, setTipo] = useState('factura')

  const [numero, setNumero] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [seleccionadas, setSeleccionadas] = useState([])
  const [monto, setMonto] = useState('')
  const [facturasCliente, setFacturasCliente] = useState([])
  const [facturaRef, setFacturaRef] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  // Se incrementa tras emitir para volver a pedir el próximo N° y las órdenes.
  const [version, setVersion] = useState(0)

  const esReflejo = tipo === 'factura' || tipo === 'recibo_cobro'

  // Al cambiar tipo o cliente (o tras emitir): próximo N° y datos del tipo.
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
    } else if (cliente) {
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

    return () => { activo = false }
  }, [tipo, cliente, version])

  function toggleOrden(ordenId) {
    setSeleccionadas((prev) =>
      prev.includes(ordenId) ? prev.filter((id) => id !== ordenId) : [...prev, ordenId]
    )
  }

  const ordenesVisibles = esReflejo ? ordenes : []
  const facturasVisibles = !esReflejo ? facturasCliente : []
  const totalUSD = ordenesVisibles
    .filter((o) => seleccionadas.includes(o.id))
    .reduce((sum, o) => sum + Number(o.total_usd), 0)
  const bolivares = tasa ? totalUSD * Number(tasa.usd_a_ves) : null

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
      setExito(
        `${tipoDocumento(data.tipo)} #${data.numero_factura} emitida por ${formatearUSD(data.monto_facturado)}` +
          (data.monto_bs ? ` (${formatearVES(data.monto_bs)})` : '')
      )
      setSeleccionadas([])
      setMonto('')
      setMotivo('')
      setNota('')
      setFacturaRef('')
      setVersion((v) => v + 1)
      if (onEmitido) onEmitido()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo emitir el documento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <h3 className="stf-subtitulo">
        {esReflejo ? 'Órdenes por cerrar (todavía sin documento)' : 'Datos de la nota'}
      </h3>

      {esReflejo ? (
        <>
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
                    <th>Total</th>
                    <th>Bolívares</th>
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
                      <td>{formatearUSD(o.total_usd)}</td>
                      <td className="stf-celda-apagada">
                        {tasa ? formatearVES(Number(o.total_usd) * Number(tasa.usd_a_ves)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {seleccionadas.length > 0 && (
            <p className="stf-total-seleccion">
              Seleccionadas: <strong>{formatearUSD(totalUSD)}</strong>
              {bolivares != null && ` · ${formatearVES(bolivares)}`}
              {tasa && ` (tasa ${Number(tasa.usd_a_ves).toFixed(4)})`}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="stf-form-row">
            <input
              className="stf-input"
              placeholder="Monto (USD)"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <select
              className="stf-input"
              value={facturaRef}
              onChange={(e) => setFacturaRef(e.target.value)}
            >
              <option value="">Sin factura de referencia</option>
              {facturasVisibles.map((f) => (
                <option key={f.id} value={f.id}>
                  #{f.numero_factura} · {formatearUSD(f.monto_facturado)}
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

      <div className="stf-emit-bar">
        <div className="stf-type-chips">
          {TIPOS_DOC.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`stf-type-chip ${tipo === t.id ? 'stf-type-chip--active' : ''}`}
              onClick={() => { setTipo(t.id); setSeleccionadas([]) }}
            >
              {t.texto}
            </button>
          ))}
        </div>

        <div className="stf-emit-bar__row">
          <input
            className="stf-emit-bar__numero"
            placeholder="N° del documento"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            required
          />
          <input
            className="stf-emit-bar__nota"
            placeholder="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <button className="stf-btn stf-btn--primary" type="button" onClick={emitir} disabled={guardando}>
            {guardando ? 'Emitiendo...' : `Emitir ${tipoDocumento(tipo)}`}
          </button>
        </div>

        {error && <p className="stf-error" role="alert">{error}</p>}
        {exito && <p className="stf-exito" role="status">{exito}</p>}
      </div>
    </div>
  )
}
