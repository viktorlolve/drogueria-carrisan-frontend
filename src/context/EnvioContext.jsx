// frontend/src/context/EnvioContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const EnvioContext = createContext(null);

export function EnvioProvider({ children }) {
  const { user } = useAuth();
  const [tipoEnvio, setTipoEnvio] = useState('retiro');
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState('');
  const [loading, setLoading] = useState(false);
  const [tarifas, setTarifas] = useState([]);

  // Cargar tarifas de delivery al montar
  useEffect(() => {
    api.get('/delivery-tarifas/activas')
      .then(({ data }) => setTarifas(data || []))
      .catch(() => setTarifas([]));
  }, []);

  // Calcular costo del delivery según la ciudad de la dirección seleccionada
  const getCostoDelivery = useCallback((ciudad) => {
    if (!user) return 8.00;
    if (user.delivery_gratis) return 0;
    if (ciudad) {
      const tarifa = tarifas.find(t => t.ciudad === ciudad);
      if (tarifa) return tarifa.costo;
    }
    return tarifas.length > 0 ? tarifas[0].costo : 8.00;
  }, [user, tarifas]);

  // Costo basado en la dirección seleccionada actualmente
  const costoEnvioActual = getCostoDelivery(direccionSeleccionada?.ciudad);

  // Opciones de envío
  const opcionesEnvio = useMemo(() => [
    {
      id: 'retiro',
      label: 'Retiro en Depósito',
      titulo: 'Retiro en Depósito',
      descripcion: 'Pasa a recoger tu pedido cuando esté listo',
      icono: '🏪',
      costo: 0,
      textoCosto: 'Gratis',
      requiereDireccion: false,
      requiereAgencia: false
    },
    {
      id: 'delivery',
      label: 'Delivery en Moto',
      titulo: 'Delivery en Moto',
      descripcion: 'Entrega en tu dirección dentro de la ciudad',
      icono: '🛵',
      costo: costoEnvioActual,
      textoCosto: costoEnvioActual === 0 ? '¡Gratis para ti!' : `$${costoEnvioActual.toFixed(2)}`,
      requiereDireccion: true,
      requiereAgencia: false,
      tipoDireccion: 'delivery'
    },
    {
      id: 'envio_nacional',
      label: 'Envío Nacional',
      titulo: 'Envío Nacional',
      descripcion: 'Envío por agencia, pagas al recibir en destino',
      icono: '📦',
      costo: 0,
      textoCosto: 'Pago en destino',
      requiereDireccion: true,
      requiereAgencia: true,
      tipoDireccion: 'envio_nacional'
    }
  ], [costoEnvioActual]);

  const opcionActual = opcionesEnvio.find(op => op.id === tipoEnvio);

  // El costo de envío solo aplica al delivery (tarifas). Retiro en depósito y
  // envío nacional NO se cobran al cliente, así que el costo derivado siempre
  // es 0 para esos tipos aunque `getCostoDelivery` devuelva una tarifa.
  const costoEnvio = tipoEnvio === 'delivery' ? costoEnvioActual : 0;

  // Cargar direcciones según tipo seleccionado
  const cargarDirecciones = useCallback(async (tipo) => {
    if (!tipo || tipo === 'retiro') {
      setDirecciones([]);
      setDireccionSeleccionada(null);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.get(`/direcciones?tipo=${tipo}`);
      setDirecciones(data);
      
      // Seleccionar automáticamente la primera dirección disponible
      if (data.length > 0) {
        setDireccionSeleccionada(data[0]);
      } else {
        setDireccionSeleccionada(null);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      setDirecciones([]);
      setDireccionSeleccionada(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cambiar tipo de envío
  const cambiarTipoEnvio = useCallback((tipo) => {
    setTipoEnvio(tipo);
    setDireccionSeleccionada(null);
    setAgenciaSeleccionada('');
    
    const opcion = opcionesEnvio.find(op => op.id === tipo);
    if (opcion?.tipoDireccion) {
      cargarDirecciones(opcion.tipoDireccion);
    }
  }, [opcionesEnvio, cargarDirecciones]);

  // Guardar nueva dirección
  const guardarDireccion = async (direccionData) => {
    const opcion = opcionesEnvio.find(op => op.id === tipoEnvio);

    const dataConTipo = {
      ...direccionData,
      tipo_direccion: opcion?.tipoDireccion || 'delivery'
    };

    const { data } = await api.post('/direcciones', dataConTipo);

    if (opcion?.tipoDireccion) {
      await cargarDirecciones(opcion.tipoDireccion);
    }

    setDireccionSeleccionada(data);
    return data;
  };

  // Eliminar dirección
  const eliminarDireccion = async (id) => {
    await api.delete(`/direcciones/${id}`);
    if (direccionSeleccionada?.id === id) {
      setDireccionSeleccionada(null);
    }
    const opcion = opcionesEnvio.find(op => op.id === tipoEnvio);
    if (opcion?.tipoDireccion) {
      await cargarDirecciones(opcion.tipoDireccion);
    }
  };

  // Agencias disponibles
  const agencias = ['MRW', 'Domesa', 'Tealca', 'Zoom', 'Servientrega'];

  const value = {
    tipoEnvio,
    cambiarTipoEnvio,
    opcionesEnvio,
    opcionActual,
    direcciones,
    direccionSeleccionada,
    setDireccionSeleccionada,
    agenciaSeleccionada,
    setAgenciaSeleccionada,
    agencias,
    loading,
    cargarDirecciones,
    guardarDireccion,
    eliminarDireccion,
    costoEnvio,
    tarifas
  };

  return (
    <EnvioContext.Provider value={value}>
      {children}
    </EnvioContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useEnvio() {
  const context = useContext(EnvioContext);
  if (!context) {
    throw new Error('useEnvio debe usarse dentro de un EnvioProvider');
  }
  return context;
}
