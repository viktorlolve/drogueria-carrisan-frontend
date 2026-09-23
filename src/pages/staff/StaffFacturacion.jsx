import { useEffect, useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import TabEmitir from './StaffFacturacionEmitir'
import { tipoDocumento } from './staffFacturacionConfig'
import './StaffFinanzas.css'

function formatUSD(valor) {
  return Number(valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TABS = [
  { id: 'emitir', texto: 'Emitir documento' },
  { id: 'facturas', texto: 'Facturas' },
  { id: 'notas-credito', texto: 'Notas de crédito' },
  { id: 'notas-debito', texto: 'Notas de débito' },
  { id: 'anulados', texto: 'Documentos anulados' },
]

// ------------------------------------------------------------------
// Lista de documentos (usada por los 4 tabs de grilla)
// ------------------------------------------------------------------
function ListaDocumentos({ tipos, mostrarAnuladas }) {
  const [docs, setDocs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [anulando, setAnulando] = useState(null)

  async function cargar() {
    try {
      const { data } = await staffApi.get('/staff/contabilidad/facturas')
      setDocs(data || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los documentos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/contabilidad/facturas')
      .then(({ data }) => { if (activo) { setDocs(data || []); setError('') } })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudieron cargar los documentos') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  async function anular(doc) {
    const motivo = window.prompt(`Motivo de la anulación de ${tipoDocumento(doc.tipo)} #${doc.numero_factura}:`)
    if (!motivo || !motivo.trim()) return
    setAnulando(doc.id)
    setError('')
    try {
      await staffApi.patch(`/staff/contabilidad/facturas/${doc.id}/anular`, { motivo: motivo.trim() })
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo anular el documento')
    } finally {
      setAnulando(null)
    }
  }

  const visibles = (docs || []).filter(
    (d) => d.anulada === mostrarAnuladas && (!tipos || tipos.includes(d.tipo))
  )

  return (
    <div>
      {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>N°</th>
                <th>$</th>
                <th>Bs</th>
                <th>Referencia</th>
                <th>Motivo</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr><td colSpan="9">Sin documentos</td></tr>
              ) : (
                visibles.map((d) => (
                  <tr key={d.id}>
                    <td>{d.users?.nombre || `#${d.usuario_id}`}</td>
                    <td>{tipoDocumento(d.tipo)}</td>
                    <td>{d.numero_factura}</td>
                    <td>${formatUSD(d.monto_facturado)}</td>
                    <td>{d.monto_bs ? `Bs ${formatUSD(d.monto_bs)}` : '—'}</td>
                    <td>{d.factura_referencia_id ? `#${d.factura_referencia_id}` : '—'}</td>
                    <td>{d.motivo || d.anulada_motivo || '—'}</td>
                    <td>{formatFecha(d.created_at)}</td>
                    <td>
                      {!mostrarAnuladas && (
                        <button
                          className="stf-btn stf-btn--small stf-btn--danger"
                          onClick={() => anular(d)}
                          disabled={anulando === d.id}
                        >
                          {anulando === d.id ? 'Anulando...' : 'Anular'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Página principal: Facturación
// ------------------------------------------------------------------
function StaffFacturacion() {
  const [tab, setTab] = useState('emitir')

  return (
    <LayoutDepartamento departamento="finanzas" activo="ventas" titulo="Facturación">
      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      <div className="stf-tab-content">
        {tab === 'emitir' && <TabEmitir />}
        {tab === 'facturas' && (
          <ListaDocumentos tipos={['factura', 'recibo_cobro']} mostrarAnuladas={false} />
        )}
        {tab === 'notas-credito' && (
          <ListaDocumentos tipos={['nota_credito']} mostrarAnuladas={false} />
        )}
        {tab === 'notas-debito' && (
          <ListaDocumentos tipos={['nota_debito']} mostrarAnuladas={false} />
        )}
        {tab === 'anulados' && <ListaDocumentos mostrarAnuladas />}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffFacturacion