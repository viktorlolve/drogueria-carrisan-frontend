import { useState, useEffect } from 'react';
import api from '../api/axios';
import './GestionDirecciones.css';

const CIUDADES_DELIVERY = ['Valencia', 'Naguanagua', 'San Diego', 'Guacara', 'Los Guayos'];
const ESTADO_DELIVERY = 'Carabobo';

function GestionDirecciones() {
  const [direccionesDelivery, setDireccionesDelivery] = useState([]);
  const [direccionesNacional, setDireccionesNacional] = useState([]);
  const [tabActiva, setTabActiva] = useState('delivery');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    estado: ESTADO_DELIVERY,
    telefono_contacto: '',
    referencia: '',
    agencia_preferida: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);

  const cargarDirecciones = async (tipo) => {
    try {
      const { data } = await api.get(`/direcciones?tipo=${tipo}`);
      if (tipo === 'delivery') {
        setDireccionesDelivery(data);
      } else {
        setDireccionesNacional(data);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carga inicial: se difiere en un microtask para no setear estado de forma
    // síncrona dentro del effect.
    Promise.resolve().then(() => {
      cargarDirecciones('delivery');
      cargarDirecciones('envio_nacional');
    });
  }, []);

  const direccionesActuales = tabActiva === 'delivery' ? direccionesDelivery : direccionesNacional;

  const handleAgregar = () => {
    setEditandoId(null);
    setFormData({
      nombre: '',
      direccion: '',
      ciudad: '',
      estado: tabActiva === 'delivery' ? ESTADO_DELIVERY : '',
      telefono_contacto: '',
      referencia: '',
      agencia_preferida: ''
    });
    setMostrarForm(true);
  };

  const handleEditar = (direccion) => {
    setEditandoId(direccion.id);
    setFormData({
      nombre: direccion.nombre || '',
      direccion: direccion.direccion || '',
      ciudad: direccion.ciudad || '',
      estado: direccion.estado || ESTADO_DELIVERY,
      telefono_contacto: direccion.telefono_contacto || '',
      referencia: direccion.referencia || '',
      agencia_preferida: direccion.agencia_preferida || ''
    });
    setMostrarForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.direccion) {
      setMensaje('Nombre y dirección son requeridos');
      return;
    }

    if (tabActiva === 'delivery' && !formData.ciudad) {
      setMensaje('Debes seleccionar una ciudad');
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      const datos = {
        ...formData,
        tipo_direccion: tabActiva,
        estado: tabActiva === 'delivery' ? ESTADO_DELIVERY : formData.estado
      };

      await api.post('/direcciones', datos);
      
      setMostrarForm(false);
      setMensaje('Dirección guardada exitosamente');
      
      await cargarDirecciones(tabActiva);
      
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al guardar la dirección');
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;
    
    try {
      await api.delete(`/direcciones/${id}`);
      setMensaje('Dirección eliminada');
      await cargarDirecciones(tabActiva);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      setMensaje('Error al eliminar la dirección');
      console.error(error);
    }
  };

  const handleChangeTab = (tab) => {
    setTabActiva(tab);
    setMostrarForm(false);
    setEditandoId(null);
  };

  if (loading) return (
    <div className="gestion-loading">
      <p>Cargando direcciones...</p>
    </div>
  );

  return (
    <div className="gestion-direcciones">
      <h2>Mis Direcciones</h2>
      
      {mensaje && (
        <div className={`gestion-mensaje ${mensaje.includes('Error') ? 'gestion-mensaje--error' : 'gestion-mensaje--exito'}`}>
          {mensaje}
        </div>
      )}

      {/* Tabs */}
      <div className="gestion-tabs">
        <button
          className={`gestion-tab ${tabActiva === 'delivery' ? 'gestion-tab--active' : ''}`}
          onClick={() => handleChangeTab('delivery')}
        >
          🛵 Delivery (Ciudad)
        </button>
        <button
          className={`gestion-tab ${tabActiva === 'nacional' ? 'gestion-tab--active' : ''}`}
          onClick={() => handleChangeTab('nacional')}
        >
          📦 Envío Nacional
        </button>
      </div>

      {/* Lista de direcciones */}
      <div className="gestion-lista">
        {direccionesActuales.length === 0 ? (
          <div className="gestion-vacio">
            <span className="gestion-vacio__icon">📍</span>
            <p>No tienes direcciones de {tabActiva === 'delivery' ? 'delivery' : 'envío nacional'} guardadas</p>
          </div>
        ) : (
          direccionesActuales.map((dir) => (
            <div key={dir.id} className="gestion-card">
              <div className="gestion-card__info">
                <h3>{dir.nombre}</h3>
                <p className="gestion-card__direccion">{dir.direccion}</p>
                <div className="gestion-card__detalles">
                  {dir.ciudad && <span>📍 {dir.ciudad}, {dir.estado}</span>}
                  {dir.telefono_contacto && <span>📞 {dir.telefono_contacto}</span>}
                </div>
                {dir.referencia && (
                  <p className="gestion-card__referencia">📝 {dir.referencia}</p>
                )}
                {dir.agencia_preferida && (
                  <p className="gestion-card__agencia">🚚 {dir.agencia_preferida}</p>
                )}
              </div>
              <div className="gestion-card__acciones">
                <button onClick={() => handleEditar(dir)} className="gestion-btn gestion-btn--editar">
                  ✏️
                </button>
                <button onClick={() => handleEliminar(dir.id)} className="gestion-btn gestion-btn--eliminar">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botón agregar */}
      {!mostrarForm && (
        <button onClick={handleAgregar} className="gestion-btn-agregar">
          + Agregar dirección de {tabActiva === 'delivery' ? 'delivery' : 'envío nacional'}
        </button>
      )}

      {/* Formulario modal */}
      {mostrarForm && (
        <div className="gestion-overlay" onClick={() => setMostrarForm(false)}>
          <div className="gestion-form" onClick={(e) => e.stopPropagation()}>
            <div className="gestion-form__header">
              <h3>{editandoId ? 'Editar' : 'Nueva'} dirección</h3>
              <button onClick={() => setMostrarForm(false)} className="gestion-form__close">✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="gestion-form__group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Casa, Oficina, Consultorio"
                  required
                />
              </div>

              <div className="gestion-form__group">
                <label>Dirección *</label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  placeholder="Calle, número, urbanización, etc."
                  required
                  rows="2"
                />
              </div>

              <div className="gestion-form__row">
                <div className="gestion-form__group">
                  <label>Ciudad {tabActiva === 'delivery' && '*'}</label>
                  {tabActiva === 'delivery' ? (
                    <select
                      value={formData.ciudad}
                      onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                      required
                    >
                      {CIUDADES_DELIVERY.map((ciudad, idx) => (
                        <option key={idx} value={idx === 0 ? '' : ciudad} disabled={idx === 0}>
                          {ciudad}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                      placeholder="Ciudad"
                    />
                  )}
                </div>

                <div className="gestion-form__group">
                  <label>Estado</label>
                  {tabActiva === 'delivery' ? (
                    <input
                      type="text"
                      value={ESTADO_DELIVERY}
                      disabled
                      className="gestion-form__disabled"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      placeholder="Estado"
                    />
                  )}
                </div>
              </div>

              <div className="gestion-form__group">
                <label>Teléfono de contacto</label>
                <input
                  type="text"
                  value={formData.telefono_contacto}
                  onChange={(e) => setFormData({...formData, telefono_contacto: e.target.value})}
                  placeholder="+58 212-555-1234"
                />
              </div>

              <div className="gestion-form__group">
                <label>Referencia</label>
                <input
                  type="text"
                  value={formData.referencia}
                  onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                  placeholder="Punto de referencia, color de casa, etc."
                />
              </div>

              {tabActiva === 'nacional' && (
                <div className="gestion-form__group">
                  <label>Agencia de envío preferida</label>
                  <select
                    value={formData.agencia_preferida}
                    onChange={(e) => setFormData({...formData, agencia_preferida: e.target.value})}
                  >
                    <option value="">Seleccionar agencia</option>
                    <option value="MRW">MRW</option>
                    <option value="Domesa">Domesa</option>
                    <option value="Tealca">Tealca</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Servientrega">Servientrega</option>
                    <option value="Servientrega">Otro</option>
                  </select>
                </div>
              )}

              <div className="gestion-form__acciones">
                <button type="submit" disabled={guardando} className="gestion-btn-submit">
                  {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="gestion-btn-cancel">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionDirecciones;