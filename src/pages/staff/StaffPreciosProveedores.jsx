import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle,
  ChevronRight, ArrowUp, ArrowDown, Minus, Ban, Link2Off,
} from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffPreciosProveedores.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffEstado from '../../components/staff/StaffEstado'

const PROVEEDORES = [
  { id: 'cobeca', nombre: 'COBECA' },
  { id: 'drovencentro', nombre: 'Drovencentro' },
  { id: 'bioglass', nombre: 'BIOGLASS' },
  { id: 'bc-group', nombre: 'BC GROUP' },
  { id: 'med-importados', nombre: 'MED IMPORTADOS' },
]

// Frescura de la ÚLTIMA SUBIDA del proveedor (no confundir con "precios
// viejos", que cuenta líneas de costo individuales con más de 60 días).
function frescura(dias) {
  if (dias == null) return 'nunca'
  if (dias <= 7) return 'reciente'
  if (dias <= 30) return 'media'
  return 'vieja'
}

function textoRelativo(dias) {
  if (dias == null) return 'Nunca se ha subido'
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

export default function StaffPreciosProveedores() {
  const { avisar } = useStaffUI()
  const navigate = useNavigate()
  const [resumen, setResumen] = useState({ proveedores: [], totales: {} })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [provSel, setProvSel] = useState('cobeca')
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState(null)

  function cargar() {
    setCargando(true)
    setError('')
    staffApi.get('/staff/proveedores/resumen')
      .then(r => setResumen(r.data || { proveedores: [], totales: {} }))
      .catch(e => setError(e.response?.data?.mensaje || 'Error al cargar resumen'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => {
      if (!activo) return
      setCargando(true)
      setError('')
      staffApi.get('/staff/proveedores/resumen')
        .then(r => { if (activo) setResumen(r.data || { proveedores: [], totales: {} }) })
        .catch(e => { if (activo) setError(e.response?.data?.mensaje || 'Error al cargar resumen') })
        .finally(() => { if (activo) setCargando(false) })
    })
    return () => { activo = false }
  }, [])

  async function importar() {
    if (!archivo) { setError('Selecciona un archivo'); return }
    setSubiendo(true)
    setError('')
    setResultado(null)
    const fd = new FormData()
    fd.append('archivo', archivo)
    try {
      const { data } = await staffApi.post(`/staff/proveedores/${provSel}/importar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })
      setResultado(data)
      avisar('Importación completada')
      setArchivo(null)
      cargar()
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al importar')
    } finally {
      setSubiendo(false)
    }
  }

  function irAPendientes(tipo, proveedorId) {
    const params = new URLSearchParams({ tipo })
    if (proveedorId) params.set('proveedor', proveedorId)
    navigate(`/staff/pendientes-inventario?${params.toString()}`)
  }

  function porId(id) {
    return (resumen.proveedores || []).find((p) => p.proveedor === id)
  }

  const infoSel = porId(provSel)

  function onElegirArchivo(e) {
    const f = e.target.files?.[0] || null
    setArchivo(f)
    setResultado(null)
    setError('')
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="precios-proveedores" titulo="Actualización de precios por proveedor">
      <div className="spp-page">
        <div className="spp-grid">
          {/* -------- Subir archivo -------- */}
          <div className="spp-card">
            <h2 className="spp-card__titulo">Subir archivo</h2>

            <p className="spp-label">Proveedor</p>
            <div className="spp-chips">
              {PROVEEDORES.map((p) => {
                const info = porId(p.id)
                const estado = frescura(info?.ultimaSubida?.dias)
                const activo = provSel === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`spp-chip ${activo ? 'spp-chip--activo' : ''}`}
                    onClick={() => { setProvSel(p.id); setResultado(null); setError('') }}
                  >
                    <span className={`spp-chip-dot spp-chip-dot--${estado}`} />
                    {p.nombre}
                  </button>
                )
              })}
            </div>

            {infoSel && (
              <p className={`spp-sel-aviso spp-sel-aviso--${frescura(infoSel.ultimaSubida?.dias)}`}>
                Última subida: {textoRelativo(infoSel.ultimaSubida?.dias)}
              </p>
            )}

            <label className={`spp-dropzone ${archivo ? 'spp-dropzone--con-archivo' : ''}`}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={onElegirArchivo} />
              {archivo ? (
                <>
                  <FileSpreadsheet size={22} />
                  <span className="spp-dropzone-nombre">{archivo.name}</span>
                  <button
                    type="button"
                    className="spp-dropzone-quitar"
                    onClick={(e) => { e.preventDefault(); setArchivo(null) }}
                    aria-label="Quitar archivo"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={22} />
                  <span>Elegir archivo (.xlsx, .xls o .csv)</span>
                </>
              )}
            </label>

            <button className="spp-btn-importar" onClick={importar} disabled={subiendo || !archivo}>
              {subiendo ? 'Importando...' : `Importar precios de ${PROVEEDORES.find(p => p.id === provSel)?.nombre}`}
            </button>

            <p className="spp-hint">Solo se actualizan precios/costos. No se crean productos nuevos. Los sin enlazar van a Pendientes.</p>
            {error && <p className="spp-error">{error}</p>}

            {resultado && (
              <div className="spp-recibo">
                <p className="spp-recibo__titulo">Recibo de importación — {resultado.total || 0} filas leídas</p>
                <div className="spp-recibo__grid">
                  <div className="spp-stat">
                    <span className="spp-stat-icono spp-stat-icono--neutral"><CheckCircle2 size={14} /></span>
                    <span className="spp-stat-valor">{resultado.actualizados || 0}</span>
                    <span className="spp-stat-label">Actualizados</span>
                  </div>
                  <div className="spp-stat">
                    <span className="spp-stat-icono spp-stat-icono--ok"><ArrowUp size={14} /></span>
                    <span className="spp-stat-valor">{resultado.subieron || 0}</span>
                    <span className="spp-stat-label">Subieron</span>
                  </div>
                  <div className="spp-stat">
                    <span className="spp-stat-icono spp-stat-icono--aviso"><ArrowDown size={14} /></span>
                    <span className="spp-stat-valor">{resultado.bajaron || 0}</span>
                    <span className="spp-stat-label">Bajaron</span>
                  </div>
                  <div className="spp-stat">
                    <span className="spp-stat-icono spp-stat-icono--neutral"><Minus size={14} /></span>
                    <span className="spp-stat-valor">{resultado.iguales || 0}</span>
                    <span className="spp-stat-label">Iguales</span>
                  </div>
                  <div className="spp-stat">
                    <span className="spp-stat-icono spp-stat-icono--error"><Ban size={14} /></span>
                    <span className="spp-stat-valor">{resultado.puestosEnCero || 0}</span>
                    <span className="spp-stat-label">Puestos en 0</span>
                  </div>
                  <button
                    type="button"
                    className="spp-stat spp-stat--accion"
                    onClick={() => irAPendientes('sin_enlazar', provSel)}
                    disabled={!resultado.sin_enlazar}
                  >
                    <span className="spp-stat-icono spp-stat-icono--aviso"><Link2Off size={14} /></span>
                    <span className="spp-stat-valor">{resultado.sin_enlazar || 0}</span>
                    <span className="spp-stat-label">Sin enlazar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* -------- Estado por proveedor -------- */}
          <div className="spp-card">
            <h2 className="spp-card__titulo">Estado por proveedor</h2>

            {cargando ? <StaffEstado tipo="cargando" filas={5} /> : (
              <div className="spp-proveedores">
                {(resumen.proveedores || []).map((p) => {
                  const estado = frescura(p.ultimaSubida?.dias)
                  return (
                    <div key={p.proveedor} className="spp-prov-card">
                      <div className="spp-prov-cabecera">
                        <span className="spp-prov-nombre">{p.nombre}</span>
                        <span className={`spp-prov-frescura spp-prov-frescura--${estado}`}>
                          {estado === 'vieja' && <AlertTriangle size={12} />}
                          {textoRelativo(p.ultimaSubida?.dias)}
                        </span>
                      </div>
                      <div className="spp-prov-badges">
                        <button
                          type="button"
                          className={`spp-badge ${p.sinEnlazar > 0 ? 'spp-badge--aviso' : 'spp-badge--ok'}`}
                          onClick={() => irAPendientes('sin_enlazar', p.proveedor)}
                        >
                          {p.sinEnlazar > 0 ? <Link2Off size={13} /> : <CheckCircle2 size={13} />}
                          {p.sinEnlazar || 0} sin enlazar
                        </button>
                        <button
                          type="button"
                          className={`spp-badge ${p.preciosViejos > 0 ? 'spp-badge--error' : 'spp-badge--ok'}`}
                          onClick={() => irAPendientes('precios_viejos', p.proveedor)}
                        >
                          {p.preciosViejos > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                          {p.preciosViejos || 0} precios viejos (&gt;60d)
                        </button>
                        <ChevronRight size={16} className="spp-prov-flecha" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="spp-totales">
              <div className="spp-total-chip">
                <span>Sin proveedor</span>
                <strong>{resumen.totales?.sinProveedor || 0}</strong>
              </div>
              <div className="spp-total-chip">
                <span>Sin enlazar (todos)</span>
                <strong>{resumen.totales?.sinEnlazarTotal || 0}</strong>
              </div>
              <button className="spp-btn" onClick={() => navigate('/staff/pendientes-inventario')}>
                Ver todos los pendientes
              </button>
            </div>
          </div>
        </div>
      </div>
    </LayoutDepartamento>
  )
}