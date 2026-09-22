// StaffClientes.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffClientes.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StaffClientes({ departamento = 'comercial', activo = 'clientes', titulo = 'Clientes' }) {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)

  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [etiquetas, setEtiquetas] = useState([])
  const debounceRef = useRef(null)

  const cargar = useCallback(async (pag) => {
    setCargando(true)
    try {
      const params = { pagina: pag, por_pagina: 20 }
      if (buscar.trim().length >= 2) params.buscar = buscar.trim()
      if (tipo) params.tipo = tipo
      if (etiqueta) params.etiqueta = etiqueta

      const { data } = await staffApi.get('/staff/clientes', { params })
      setClientes(data?.clientes || [])
      setTotal(data?.total || 0)
      setPagina(data?.pagina || 1)
      setTotalPaginas(data?.total_paginas || 1)
      setEtiquetas(data?.etiquetas || [])
    } catch {
      setClientes([])
    } finally {
      setCargando(false)
    }
  }, [buscar, tipo, etiqueta])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      cargar(1)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscar, tipo, etiqueta, cargar])

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
        <select className="sc-select" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
          <option value="">Todas las etiquetas</option>
          {etiquetas.map((e) => (
            <option key={e.etiqueta} value={e.etiqueta}>
              {e.etiqueta} · {Number(e.porcentaje) > 0 ? `−${e.porcentaje}%` : `+${-Number(e.porcentaje)}%`}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="sc-cargando">Cargando clientes...</p>
      ) : clientes.length === 0 ? (
        <p className="sc-vacio">No se encontraron clientes.</p>
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
                  <th>Etiqueta</th>
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
                    <td>
                      {c.etiqueta ? (
                        <span className="sc-badge sc-badge--tipo">
                          {c.etiqueta}
                          {(() => {
                            const eObj = etiquetas.find((x) => x.etiqueta === c.etiqueta)
                            const p = eObj ? Number(eObj.porcentaje) : null
                            return p != null ? (p > 0 ? ` · −${p}%` : ` · +${-p}%`) : ''
                          })()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="sc-money">{c.linea_credito > 0 ? `$${formatUSD(c.linea_credito)}` : '—'}</td>
                    <td className={`sc-money ${c.deuda_actual > 0 ? 'sc-money--warn' : ''}`}>
                      {c.deuda_actual > 0 ? `$${formatUSD(c.deuda_actual)}` : '$0'}
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