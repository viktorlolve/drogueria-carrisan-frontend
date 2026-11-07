import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import StaffModal from './StaffModal'
import StaffEstado from './StaffEstado'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import './ColaOrdenes.css'
import './TarifasDeliveryModal.css'

// ---------------------------------------------------------------
// Tarifas de delivery por ciudad — CRUD para Logística.
//
// El admin ya tenía esta gestión en /admin/delivery; acá se expone al
// despachador (y a los roles amplios) con sesión staff vía
// /staff/delivery-tarifas. El checkout del cliente sigue leyendo
// GET /delivery-tarifas/activas (público), sin cambios.
//
// Se abre desde el header de /staff/delivery, igual que las agencias de
// envío se abren desde /staff/envios.
// ---------------------------------------------------------------
function TarifasDeliveryModal() {
  const { avisar, confirmar } = useStaffUI()
  const [abierto, setAbierto] = useState(false)
  const [tarifas, setTarifas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const [nuevaCiudad, setNuevaCiudad] = useState('')
  const [nuevoCosto, setNuevoCosto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [editandoId, setEditandoId] = useState(null)
  const [edicionCosto, setEdicionCosto] = useState('')

  function cargar() {
    setCargando(true)
    setError('')
    staffApi
      .get('/staff/delivery-tarifas')
      .then(({ data }) => setTarifas(data || []))
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar las tarifas'))
      .finally(() => setCargando(false))
  }

  function abrir() {
    setAbierto(true)
    setEditandoId(null)
    setNuevaCiudad('')
    setNuevoCosto('')
    cargar()
  }

  async function crear(e) {
    e.preventDefault()
    const ciudad = nuevaCiudad.trim()
    const costo = Number(nuevoCosto)
    if (!ciudad) return avisar('Indicá la ciudad', 'error')
    if (nuevoCosto === '' || !Number.isFinite(costo) || costo < 0) {
      return avisar('Indicá un costo válido (0 o más)', 'error')
    }
    setGuardando(true)
    try {
      await staffApi.post('/staff/delivery-tarifas', { ciudad, costo })
      setNuevaCiudad('')
      setNuevoCosto('')
      avisar('Tarifa creada')
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo crear la tarifa', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function guardarCosto(tarifa) {
    const costo = Number(edicionCosto)
    if (!Number.isFinite(costo) || costo < 0) return avisar('Costo inválido', 'error')
    try {
      await staffApi.put(`/staff/delivery-tarifas/${tarifa.id}`, { costo })
      setEditandoId(null)
      avisar('Costo actualizado')
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo actualizar el costo', 'error')
    }
  }

  async function alternarActivo(tarifa) {
    try {
      await staffApi.put(`/staff/delivery-tarifas/${tarifa.id}`, { activo: !tarifa.activo })
      avisar(tarifa.activo ? 'Tarifa desactivada' : 'Tarifa activada')
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo cambiar el estado', 'error')
    }
  }

  async function eliminar(tarifa) {
    const ok = await confirmar({
      titulo: `¿Eliminar la tarifa de ${tarifa.ciudad}?`,
      texto: 'Los envíos nuevos a esa ciudad se quedarán sin tarifa hasta que la vuelvas a crear.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await staffApi.delete(`/staff/delivery-tarifas/${tarifa.id}`)
      avisar('Tarifa eliminada')
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo eliminar la tarifa', 'error')
    }
  }

  const activas = tarifas.filter((t) => t.activo).length

  return (
    <>
      <button className="sp-btn sp-btn--outline" type="button" onClick={abrir}>
        Tarifas de delivery
      </button>

      {abierto && (
        <StaffModal titulo="Tarifas de delivery por ciudad" onCerrar={() => setAbierto(false)}>
          <p className="sdt-nota">
            El costo se cobra en el checkout a los pedidos con envío delivery. {activas} de{' '}
            {tarifas.length} activas.
          </p>

          {cargando && <StaffEstado tipo="cargando" filas={3} />}
          {!cargando && error && <StaffEstado tipo="error" mensaje={error} onReintentar={cargar} />}

          {!cargando && !error && (
            <>
              {tarifas.length === 0 ? (
                <StaffEstado tipo="vacio" titulo="No hay tarifas configuradas" mensaje="Creá la primera abajo." />
              ) : (
                <div className="sdt-lista">
                  {tarifas.map((t) => (
                    <div key={t.id} className={`sdt-fila ${t.activo ? '' : 'sdt-fila--inactiva'}`}>
                      <span className="sdt-ciudad">{t.ciudad}</span>

                      {editandoId === t.id ? (
                        <span className="sdt-edicion">
                          <input
                            className="sdt-costo-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={edicionCosto}
                            onChange={(e) => setEdicionCosto(e.target.value)}
                            aria-label={`Costo de envío a ${t.ciudad}`}
                          />
                          <button className="sp-btn" type="button" onClick={() => guardarCosto(t)}>Guardar</button>
                          <button className="sp-btn" type="button" onClick={() => setEditandoId(null)}>Cancelar</button>
                        </span>
                      ) : (
                        <>
                          <span className="sdt-costo">{formatearUSD(t.costo)}</span>
                          <span className="sdt-acciones">
                            <button
                              className="sp-btn"
                              type="button"
                              onClick={() => { setEditandoId(t.id); setEdicionCosto(String(t.costo ?? '')) }}
                            >
                              Editar costo
                            </button>
                            <button
                              className={`sp-btn ${t.activo ? '' : 'sp-btn--principal'}`}
                              type="button"
                              onClick={() => alternarActivo(t)}
                            >
                              {t.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button className="sp-btn sp-btn--danger" type="button" onClick={() => eliminar(t)}>
                              Eliminar
                            </button>
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <hr />

              <form className="sdt-form" onSubmit={crear}>
                <p className="sdt-form__titulo">Nueva tarifa</p>
                <div className="sdt-form__fila">
                  <input
                    type="text"
                    placeholder="Ciudad *"
                    value={nuevaCiudad}
                    onChange={(e) => setNuevaCiudad(e.target.value)}
                    disabled={guardando}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Costo (USD) *"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    disabled={guardando}
                  />
                </div>
                <div className="sp-acciones">
                  <button className="sp-btn sp-btn--principal" type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Crear tarifa'}
                  </button>
                </div>
              </form>
            </>
          )}
        </StaffModal>
      )}
    </>
  )
}

export default TarifasDeliveryModal
