import { useState, useEffect } from 'react'
import api from '../../api/axios'
import './DescuentosForm.css'

const ALCANCES = [
  { valor: 'producto', label: 'Producto', icono: '📦' },
  { valor: 'marca', label: 'Marca', icono: '🏷️' },
  { valor: 'laboratorio', label: 'Laboratorio', icono: '🧪' },
  { valor: 'molecula', label: 'Molécula', icono: '⚗️' },
  { valor: 'linea', label: 'Línea', icono: '📊' },
  { valor: 'forma', label: 'Forma', icono: '💊' },
]

const CAMPOS_TEXTO = ['laboratorio', 'molecula', 'linea', 'forma']

// Función para formatear fecha a YYYY-MM-DDTHH:MM
function toDatetimeLocal(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Función para obtener fecha actual en formato YYYY-MM-DDTHH:MM
function getAhora() {
  return toDatetimeLocal(new Date())
}

// Formatear para mostrar: DD/MM/YY HH:MM
function formatearFecha(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

// ============================================================
// Buscador reutilizable — usado por marca y los campos de texto.
// Filtra en el cliente sobre una lista ya cargada (no pega a la
// API en cada tecleo, a diferencia de la búsqueda de producto que
// sí es server-side por el volumen del catálogo).
// ============================================================
function SelectorBuscador({
  opciones,           // [{ valor, etiqueta }]
  valorSeleccionado,
  etiquetaSeleccionada,
  onSeleccionar,      // (valor, etiqueta) => void
  onLimpiar,
  placeholder,
  permitirLibre = false,
  error,
}) {
  const [query, setQuery] = useState('')

  if (valorSeleccionado) {
    return (
      <div className="producto-seleccionado">
        <span>{etiquetaSeleccionada}</span>
        <button type="button" className="btn-cambiar" onClick={onLimpiar}>
          Cambiar
        </button>
      </div>
    )
  }

  const texto = query.trim().toLowerCase()
  const filtradas = texto
    ? opciones.filter(o => o.etiqueta.toLowerCase().includes(texto))
    : opciones
  const hayExacta = opciones.some(o => o.etiqueta.toLowerCase() === texto)

  return (
    <>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className={error ? 'error' : ''}
      />
      {texto && (filtradas.length > 0 || (permitirLibre && !hayExacta)) && (
        <ul className="resultados-busqueda">
          {filtradas.slice(0, 8).map(o => (
            <li
              key={o.valor}
              onClick={() => { onSeleccionar(o.valor, o.etiqueta); setQuery('') }}
            >
              <div className="rb-info">
                <strong>{o.etiqueta}</strong>
              </div>
            </li>
          ))}
          {permitirLibre && !hayExacta && (
            <li
              className="rb-libre"
              onClick={() => { onSeleccionar(query.trim(), query.trim()); setQuery('') }}
            >
              <div className="rb-info">
                <strong>Usar "{query.trim()}"</strong>
                <small>No está en la lista — se guardará como valor nuevo</small>
              </div>
            </li>
          )}
        </ul>
      )}
    </>
  )
}

export default function DescuentoForm({
  productoFijo = null,
  descuentoExistente = null,
  onGuardado,
  onCancelar,
}) {
  const esEdicion = !!descuentoExistente
  const alcanceBloqueado = !!productoFijo

  const [alcance, setAlcance] = useState(
    descuentoExistente?.alcance || (alcanceBloqueado ? 'producto' : 'producto')
  )
  const [productoId, setProductoId] = useState(
    descuentoExistente?.producto_id || productoFijo?.id || null
  )
  const [productoLabel, setProductoLabel] = useState(
    descuentoExistente?.productos?.nombre_comercial || productoFijo?.nombre_comercial || ''
  )
  const [marcaId, setMarcaId] = useState(descuentoExistente?.marca_id || '')
  const [alcanceValor, setAlcanceValor] = useState(descuentoExistente?.alcance_valor || '')
  const [tipo, setTipo] = useState(descuentoExistente?.tipo || 'porcentaje')
  const [valor, setValor] = useState(descuentoExistente?.valor || '')
  const [fechaInicio, setFechaInicio] = useState(
    descuentoExistente?.fecha_inicio ? toDatetimeLocal(descuentoExistente.fecha_inicio) : ''
  )
  const [fechaFin, setFechaFin] = useState(
    descuentoExistente?.fecha_fin ? toDatetimeLocal(descuentoExistente.fecha_fin) : ''
  )
  const [activo, setActivo] = useState(descuentoExistente?.activo ?? true)
  const [descripcion, setDescripcion] = useState(descuentoExistente?.descripcion || '')

  const [marcas, setMarcas] = useState([])
  const [valoresTexto, setValoresTexto] = useState([])

  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState([])

  // Etiqueta de la marca ya seleccionada (para edición, donde solo tenemos el id)
  const [marcaLabel, setMarcaLabel] = useState(
    descuentoExistente?.marcas?.nombre || ''
  )

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})
  const [paso, setPaso] = useState(1)

  useEffect(() => {
    if (alcanceBloqueado) return
    api.get('/marcas')
      .then(res => setMarcas(res.data))
      .catch(() => setMarcas([]))
  }, [alcanceBloqueado])

  useEffect(() => {
    if (!CAMPOS_TEXTO.includes(alcance)) return
    api.get(`/products/valores-distintos?campo=${alcance}`)
      .then(res => setValoresTexto(res.data))
      .catch(() => setValoresTexto([]))
  }, [alcance])

  useEffect(() => {
    if (alcanceBloqueado || alcance !== 'producto' || !busquedaProducto.trim()) return
    const timeout = setTimeout(() => {
      api.get(`/products?search=${encodeURIComponent(busquedaProducto)}`)
        .then(res => setResultadosProducto(res.data.slice(0, 8)))
        .catch(() => setResultadosProducto([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [busquedaProducto, alcance, alcanceBloqueado])

  const resultadosProductoVisibles =
    !alcanceBloqueado && alcance === 'producto' && busquedaProducto.trim() ? resultadosProducto : []
  const marcaLabelFinal = marcaLabel || marcas.find(m => String(m.id) === String(marcaId))?.nombre || ''

  function seleccionarProducto(p) {
    setProductoId(p.id)
    setProductoLabel(p.nombre_comercial)
    setResultadosProducto([])
    setBusquedaProducto('')
    setErrores(prev => ({ ...prev, producto: '' }))
  }

  function cambiarAlcance(nuevoAlcance) {
    setAlcance(nuevoAlcance)
    setProductoId(null)
    setProductoLabel('')
    setMarcaId('')
    setMarcaLabel('')
    setAlcanceValor('')
    setErrores({})
  }

  function validarPaso1() {
    const errs = {}
    if (alcance === 'producto' && !productoId) {
      errs.producto = 'Selecciona un producto'
    }
    if (alcance === 'marca' && !marcaId) {
      errs.marca = 'Selecciona una marca'
    }
    if (CAMPOS_TEXTO.includes(alcance) && !alcanceValor.trim()) {
      errs.alcanceValor = 'Selecciona o escribe un valor'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function validarTodo() {
    const errs = {}
    if (alcance === 'producto' && !productoId) errs.producto = 'Selecciona un producto'
    if (alcance === 'marca' && !marcaId) errs.marca = 'Selecciona una marca'
    if (CAMPOS_TEXTO.includes(alcance) && !alcanceValor.trim()) errs.alcanceValor = 'Selecciona un valor'
    if (!valor || Number(valor) <= 0) errs.valor = 'Ingresa un valor mayor a 0'
    if (tipo === 'porcentaje' && Number(valor) > 100) errs.valor = 'Máximo 100%'
    if (!fechaInicio) errs.fechaInicio = 'La fecha de inicio es requerida'
    if (fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      errs.fechaFin = 'Debe ser posterior a la fecha de inicio'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  // Solo navega, NO hace submit
  function handleSiguiente(e) {
    e.preventDefault()
    if (paso === 1 && validarPaso1()) {
      setPaso(2)
    }
  }

  function handleAnterior(e) {
    e.preventDefault()
    setPaso(1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validarTodo()) return

    setGuardando(true)
    const payload = {
      alcance,
      producto_id: alcance === 'producto' ? productoId : null,
      marca_id: alcance === 'marca' ? Number(marcaId) : null,
      alcance_valor: CAMPOS_TEXTO.includes(alcance) ? alcanceValor : null,
      tipo,
      valor: Number(valor),
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
      activo,
      descripcion: descripcion || undefined,
    }

    try {
      const res = esEdicion
        ? await api.put(`/descuentos/${descuentoExistente.id}`, payload)
        : await api.post('/descuentos', payload)
      onGuardado?.(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el descuento')
    } finally {
      setGuardando(false)
    }
  }

  const alcanceActual = ALCANCES.find(a => a.valor === alcance)

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-content descuento-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{esEdicion ? '✏️ Editar Descuento' : '🏷️ Nuevo Descuento'}</h2>
          <button className="modal-close" onClick={onCancelar}>✕</button>
        </div>

        {/* Pasos */}
        <div className="form-pasos">
          <div className={`paso ${paso === 1 ? 'active' : paso > 1 ? 'completed' : ''}`}>
            <div className="paso-numero">{paso > 1 ? '✓' : '1'}</div>
            <span>Alcance</span>
          </div>
          <div className="paso-linea"></div>
          <div className={`paso ${paso === 2 ? 'active' : ''}`}>
            <div className="paso-numero">2</div>
            <span>Valor y Fechas</span>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Paso 1: Alcance */}
          {paso === 1 && (
            <div className="form-section">
              {!alcanceBloqueado && (
                <div className="form-group">
                  <label>¿A qué aplica el descuento?</label>
                  <div className="alcance-grid">
                    {ALCANCES.map(a => (
                      <label
                        key={a.valor}
                        className={`alcance-card ${alcance === a.valor ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="alcance"
                          value={a.valor}
                          checked={alcance === a.valor}
                          onChange={() => cambiarAlcance(a.valor)}
                        />
                        <span className="alcance-icon">{a.icono}</span>
                        <span className="alcance-label">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {alcance === 'producto' && (
                <div className="form-group">
                  <label>Buscar producto *</label>
                  {alcanceBloqueado ? (
                    <div className="producto-fijo">
                      <span>📦 {productoLabel}</span>
                    </div>
                  ) : productoId ? (
                    <div className="producto-seleccionado">
                      <span>📦 {productoLabel}</span>
                      <button
                        type="button"
                        className="btn-cambiar"
                        onClick={() => {
                          setProductoId(null)
                          setProductoLabel('')
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Escribe el nombre del producto..."
                        value={busquedaProducto}
                        onChange={e => setBusquedaProducto(e.target.value)}
                        className={errores.producto ? 'error' : ''}
                      />
                      {resultadosProductoVisibles.length > 0 && (
                        <ul className="resultados-busqueda">
                          {resultadosProductoVisibles.map(p => (
                            <li key={p.id} onClick={() => seleccionarProducto(p)}>
                              <span className="rb-icon">📦</span>
                              <div className="rb-info">
                                <strong>{p.nombre_comercial}</strong>
                                <small>{p.laboratorio} · ${Number(p.precio_usd).toFixed(2)}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  {errores.producto && <span className="error-text">{errores.producto}</span>}
                </div>
              )}

              {alcance === 'marca' && (
                <div className="form-group">
                  <label>Buscar marca *</label>
                  <SelectorBuscador
                    opciones={marcas.map(m => ({ valor: m.id, etiqueta: m.nombre }))}
                    valorSeleccionado={marcaId}
                    etiquetaSeleccionada={marcaLabelFinal}
                    onSeleccionar={(valor, etiqueta) => {
                      setMarcaId(valor)
                      setMarcaLabel(etiqueta)
                      setErrores(prev => ({ ...prev, marca: '' }))
                    }}
                    onLimpiar={() => { setMarcaId(''); setMarcaLabel('') }}
                    placeholder="Escribe el nombre de la marca..."
                    error={errores.marca}
                  />
                  {errores.marca && <span className="error-text">{errores.marca}</span>}
                </div>
              )}

              {CAMPOS_TEXTO.includes(alcance) && (
                <div className="form-group">
                  <label>Buscar {alcanceActual?.label?.toLowerCase()} *</label>
                  <SelectorBuscador
                    opciones={valoresTexto.map(v => ({ valor: v, etiqueta: v }))}
                    valorSeleccionado={alcanceValor}
                    etiquetaSeleccionada={alcanceValor}
                    onSeleccionar={(valor) => {
                      setAlcanceValor(valor)
                      setErrores(prev => ({ ...prev, alcanceValor: '' }))
                    }}
                    onLimpiar={() => setAlcanceValor('')}
                    placeholder={`Escribe el ${alcanceActual?.label?.toLowerCase()}...`}
                    permitirLibre
                    error={errores.alcanceValor}
                  />
                  {errores.alcanceValor && <span className="error-text">{errores.alcanceValor}</span>}
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Valor y Fechas */}
          {paso === 2 && (
            <div className="form-section">
              {/* Tipo de descuento */}
              <div className="form-group">
                <label>Tipo de Descuento</label>
                <div className="tipo-selector">
                  <label className={`tipo-card ${tipo === 'porcentaje' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="tipo"
                      value="porcentaje"
                      checked={tipo === 'porcentaje'}
                      onChange={(e) => setTipo(e.target.value)}
                    />
                    <span className="tipo-icon">%</span>
                    <div className="tipo-texto">
                      <strong>Porcentaje</strong>
                      <small>Ej: 15% de descuento</small>
                    </div>
                  </label>
                  <label className={`tipo-card ${tipo === 'monto' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="tipo"
                      value="monto"
                      checked={tipo === 'monto'}
                      onChange={(e) => setTipo(e.target.value)}
                    />
                    <span className="tipo-icon">$</span>
                    <div className="tipo-texto">
                      <strong>Monto Fijo</strong>
                      <small>Ej: $5.00 de descuento</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Valor */}
              <div className="form-group">
                <label>Valor del Descuento *</label>
                <div className="input-precio">
                  <span className="precio-simbolo">{tipo === 'porcentaje' ? '%' : '$'}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={tipo === 'porcentaje' ? 100 : undefined}
                    value={valor}
                    onChange={e => { setValor(e.target.value); setErrores(prev => ({...prev, valor: ''})) }}
                    className={errores.valor ? 'error' : ''}
                    placeholder={tipo === 'porcentaje' ? '15' : '5.00'}
                  />
                </div>
                {errores.valor && <span className="error-text">{errores.valor}</span>}
              </div>

              {/* Fechas */}
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Inicio *</label>
                  <div className="fecha-input-group">
                    <input
                      type="datetime-local"
                      value={fechaInicio}
                      onChange={e => { setFechaInicio(e.target.value); setErrores(prev => ({...prev, fechaInicio: ''})) }}
                      className={errores.fechaInicio ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="btn-hoy"
                      onClick={() => {
                        setFechaInicio(getAhora())
                        setErrores(prev => ({...prev, fechaInicio: ''}))
                      }}
                      title="Usar fecha y hora actual"
                    >
                      📍 Hoy
                    </button>
                  </div>
                  {fechaInicio && (
                    <span className="fecha-preview">{formatearFecha(fechaInicio)}</span>
                  )}
                  {errores.fechaInicio && <span className="error-text">{errores.fechaInicio}</span>}
                </div>

                <div className="form-group">
                  <label>Fecha de Fin (opcional)</label>
                  <div className="fecha-input-group">
                    <input
                      type="datetime-local"
                      value={fechaFin}
                      onChange={e => { setFechaFin(e.target.value); setErrores(prev => ({...prev, fechaFin: ''})) }}
                      className={errores.fechaFin ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="btn-hoy"
                      onClick={() => {
                        const inicio = fechaInicio ? new Date(fechaInicio) : new Date()
                        const fin = new Date(inicio.getTime() + 30 * 24 * 60 * 60 * 1000)
                        setFechaFin(toDatetimeLocal(fin))
                        setErrores(prev => ({...prev, fechaFin: ''}))
                      }}
                      title="Establecer 30 días después del inicio"
                    >
                      📅 +30d
                    </button>
                  </div>
                  {fechaFin && (
                    <span className="fecha-preview">{formatearFecha(fechaFin)}</span>
                  )}
                  {errores.fechaFin && <span className="error-text">{errores.fechaFin}</span>}
                </div>
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows="2"
                  placeholder="Ej: Descuento de verano 2026..."
                />
              </div>

              {/* Activo */}
              <div className="form-group">
                <label className="checkbox-card">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                  />
                  <div className="checkbox-card-content">
                    <div className="checkbox-card-header">
                      <span className="checkbox-card-icon">{activo ? '✅' : '⏸️'}</span>
                      <strong>Descuento Activo</strong>
                    </div>
                    <small>Los descuentos inactivos no se aplican en el catálogo</small>
                  </div>
                </label>
              </div>

              {/* Resumen */}
              <div className="resumen-card">
                <h4>📋 Resumen del Descuento</h4>
                <div className="resumen-item">
                  <span>Alcance:</span>
                  <strong>{alcanceActual?.icono} {alcanceActual?.label}</strong>
                </div>
                <div className="resumen-item">
                  <span>Aplica a:</span>
                  <strong>
                    {alcance === 'producto' ? productoLabel :
                     alcance === 'marca' ? marcaLabelFinal || '—' :
                     alcanceValor || '—'}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>Tipo:</span>
                  <strong>{tipo === 'porcentaje' ? '% Porcentaje' : '$ Monto Fijo'}</strong>
                </div>
                <div className="resumen-item">
                  <span>Valor:</span>
                  <strong className="valor-descuento">
                    {tipo === 'porcentaje' ? `${valor}%` : `$${Number(valor || 0).toFixed(2)}`}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>Inicio:</span>
                  <strong>{formatearFecha(fechaInicio)}</strong>
                </div>
                {fechaFin && (
                  <div className="resumen-item">
                    <span>Fin:</span>
                    <strong>{formatearFecha(fechaFin)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="form-navegacion">
            {paso > 1 ? (
              <button type="button" onClick={handleAnterior} className="btn-secundario">
                ← Anterior
              </button>
            ) : (
              <button type="button" onClick={onCancelar} className="btn-secundario">
                Cancelar
              </button>
            )}

            {paso < 2 ? (
              <button
                type="button"
                onClick={handleSiguiente}
                className="btn-primario"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                disabled={guardando}
                className="btn-guardar"
              >
                {guardando ? (
                  <><span className="spinner-small"></span> Guardando...</>
                ) : (
                  esEdicion ? '💾 Guardar Cambios' : '✨ Crear Descuento'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
