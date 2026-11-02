// StaffClientes.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffClientes.css'
import StaffEstado from '../../components/staff/StaffEstado'
import { formatearUSD } from '../../utils/formato'

function StaffClientes({ departamento = 'comercial', activo = 'clientes', titulo = 'Clientes' }) {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)

  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState('')
  const [etiqueta_registro, setEtiquetaRegistro] = useState('')
  const [etiqueta_pago, setEtiquetaPago] = useState('')
  const [etiqueta_comportamiento, setEtiquetaComportamiento] = useState('')
  const [etiquetas, setEtiquetas] = useState([])
  const debounceRef = useRef(null)
  const peticion = useRef(0)
  const [error, setError] = useState('')

  const cargar = useCallback(async (pag) => {
    // Solo cuenta la última petición: una búsqueda lenta no debe pisar a otra más reciente.
    const id = ++peticion.current
    setCargando(true)
    try {
      const params = { pagina: pag, por_pagina: 20 }
      if (buscar.trim().length >= 2) params.buscar = buscar.trim()
      if (tipo) params.tipo = tipo
      if (etiqueta_registro) params.etiqueta_registro = etiqueta_registro
      if (etiqueta_pago) params.etiqueta_pago = etiqueta_pago
      if (etiqueta_comportamiento) params.etiqueta_comportamiento = etiqueta_comportamiento

      const { data } = await staffApi.get('/staff/clientes', { params })
      if (id !== peticion.current) return
      setError('')
      setClientes(data?.clientes || [])
      setTotal(data?.total || 0)
      setPagina(data?.pagina || 1)
      setTotalPaginas(data?.total_paginas || 1)
      setEtiquetas(data?.etiquetas || [])
    } catch (err) {
      if (id !== peticion.current) return
      setClientes([])
      setError(err.response?.data?.error || 'No se pudieron cargar los clientes')
    } finally {
      if (id === peticion.current) setCargando(false)
    }
  }, [buscar, tipo, etiqueta_registro, etiqueta_pago, etiqueta_comportamiento])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      cargar(1)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscar, tipo, etiqueta_registro, etiqueta_pago, etiqueta_comportamiento, cargar])

  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <div className="sc-toolbar">
        <input
          className="sc-input"
          type="text"
          placeholder="Buscar por nombre, email, RIF o teléfono..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <select className="sc-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="institucional">Institucional</option>
          <option value="profesional">Profesional</option>
          <option value="honorifico">Honorífico</option>
        </select>
        
        {/* Three tag dropdowns */}
        <select 
          className="sc-select" 
          value={etiqueta_registro} 
          onChange={(e) => setEtiquetaRegistro(e.target.value)}
        >
          <option value="">Todos los registros</option>
          {etiquetas
            .filter(tag => tag.categoria === 'registro')
            .map((e) => (
              <option key={e.etiqueta} value={e.etiqueta}>
                {e.nombre_visible} · {Number(e.porcentaje) > 0 ? `−${e.porcentaje}%` : `+${-Number(e.porcentaje)}%`}
              </option>
            ))}
        </select>

        <select 
          className="sc-select" 
          value={etiqueta_pago} 
          onChange={(e) => setEtiquetaPago(e.target.value)}
        >
          <option value="">Todos los pagos</option>
          {etiquetas
            .filter(tag => tag.categoria === 'pago')
            .map((e) => (
              <option key={e.etiqueta} value={e.etiqueta}>
                {e.nombre_visible} · {Number(e.porcentaje) > 0 ? `−${e.porcentaje}%` : `+${-Number(e.porcentaje)}%`}
              </option>
            ))}
        </select>

        <select 
          className="sc-select" 
          value={etiqueta_comportamiento} 
          onChange={(e) => setEtiquetaComportamiento(e.target.value)}
        >
          <option value="">Todos los comportamientos</option>
          {etiquetas
            .filter(tag => tag.categoria === 'comportamiento')
            .map((e) => (
              <option key={e.etiqueta} value={e.etiqueta}>
                {e.nombre_visible} · {Number(e.porcentaje) > 0 ? `−${e.porcentaje}%` : `+${-Number(e.porcentaje)}%`}
              </option>
            ))}
        </select>
      </div>

      {cargando ? (
        <StaffEstado tipo="cargando" filas={5} />
      ) : error ? (
        <StaffEstado tipo="error" mensaje={error} onReintentar={() => cargar(1)} />
      ) : clientes.length === 0 ? (
        <StaffEstado tipo="vacio" titulo="No se encontraron clientes." />
      ) : (
        <>
          <div className="sc-table-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>RIF / Cédula</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Etiquetas</th>
                  <th>Total</th>
                  <th>Línea crédito</th>
                  <th>Deuda</th>
                  <th>Crédito</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/clientes/${c.id}`)}>
                    <td>
                      <div className="sc-cliente-nombre">{c.nombre || 'Sin nombre'}</div>
                      <div className="sc-cliente-email">{c.email}</div>
                    </td>
                    <td>{c.rif_cedula || '—'}</td>
                    <td>{c.telefono || '—'}</td>
                    <td><span className="sc-badge sc-badge--tipo">{c.tipo_usuario || '—'}</span></td>
                    {/* Three tags display */}
                    <td>
                      <div className="sc-tags-container">
                        {c.etiqueta_registro && (
                          <span className="sc-tag-badge tag-registro">
                            {c.etiqueta_registro}
                            {(() => {
                              const tag = etiquetas.find(t => t.etiqueta === c.etiqueta_registro)
                              return tag ? (Number(tag.porcentaje) > 0 ? ` · −${tag.porcentaje}%` : ` · +${-Number(tag.porcentaje)}%`) : ''
                            })()}
                          </span>
                        )}
                        {c.etiqueta_pago && (
                          <span className="sc-tag-badge tag-pago">
                            {c.etiqueta_pago}
                            {(() => {
                              const tag = etiquetas.find(t => t.etiqueta === c.etiqueta_pago)
                              return tag ? (Number(tag.porcentaje) > 0 ? ` · −${tag.porcentaje}%` : ` · +${-Number(tag.porcentaje)}%`) : ''
                            })()}
                          </span>
                        )}
                        {c.etiqueta_comportamiento && (
                          <span className="sc-tag-badge tag-comportamiento">
                            {c.etiqueta_comportamiento}
                            {(() => {
                              const tag = etiquetas.find(t => t.etiqueta === c.etiqueta_comportamiento)
                              return tag ? (Number(tag.porcentaje) > 0 ? ` · −${tag.porcentaje}%` : ` · +${-Number(tag.porcentaje)}%`) : ''
                            })()}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Total percentage display */}
                    <td className="sc-total-pct">
                      {(() => {
                        const total = (
                          (c.etiqueta_registro ? Number(etiquetas.find(t => t.etiqueta === c.etiqueta_registro)?.porcentaje || 0) : 0) +
                          (c.etiqueta_pago ? Number(etiquetas.find(t => t.etiqueta === c.etiqueta_pago)?.porcentaje || 0) : 0) +
                          (c.etiqueta_comportamiento ? Number(etiquetas.find(t => t.etiqueta === c.etiqueta_comportamiento)?.porcentaje || 0) : 0)
                        )
                        const displayTotal = total === 0 ? '0%' : (total > 0 ? `−${total}%` : `+${-total}%`)
                        return `Total: ${displayTotal}`
                      })()}
                    </td>
                    <td className="sc-money">{c.linea_credito > 0 ? formatearUSD(c.linea_credito) : '—'}</td>
                    <td className={`sc-money ${c.deuda_actual > 0 ? 'sc-money--warn' : ''}`}>
                      {c.deuda_actual > 0 ? formatearUSD(c.deuda_actual) : formatearUSD(0)}
                    </td>
                    <td>
                      {c.credito_bloqueado
                        ? <span className="sc-badge sc-badge--bloqueado">Bloqueado</span>
                        : <span className="sc-badge sc-badge--activo">Activo</span>
                      }
                    </td>
                    <td>
                      <button className="sc-btn-ficha" onClick={(e) => { e.stopPropagation(); navigate(`/staff/clientes/${c.id}`) }}>
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sc-paginacion">
            <button disabled={pagina <= 1} onClick={() => cargar(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {totalPaginas} ({total} clientes)</span>
            <button disabled={pagina >= totalPaginas} onClick={() => cargar(pagina + 1)}>Siguiente</button>
          </div>
        </>
      )}
    </LayoutDepartamento>
  )
}

export default StaffClientes