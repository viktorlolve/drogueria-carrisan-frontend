// src/context/FavoritosContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const FavoritosContext = createContext();

export function FavoritosProvider({ children }) {
  const [favoritos, setFavoritos] = useState([]);
  // Id del usuario cuyos favoritos ya terminaron de cargar. Antes había un
  // useState(false) para `loading` que nunca se ponía en true en la carga
  // inicial: Mis Items mostraba "no tienes favoritos" hasta que llegaba la
  // respuesta. Ahora `loading` se deriva: es true hasta que carga el usuario actual.
  const [cargadoPara, setCargadoPara] = useState(null);
  const { user, token } = useAuth();

  // Cargar favoritos cuando el usuario inicia sesión
  const cargarFavoritos = useCallback(async () => {
    if (!user || !token) {
      setFavoritos([]);
      return;
    }

    try {
      const { data } = await api.get('/favoritos');
      setFavoritos(data.favoritos || []);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    } finally {
      setCargadoPara(user.id);
    }
  }, [user, token]);

  // Cargar al iniciar sesión o cambiar usuario
  useEffect(() => {
    if (!user || !token) return
    let activo = true
    api.get('/favoritos')
      .then(({ data }) => { if (activo) setFavoritos(data.favoritos || []) })
      .catch((error) => { if (activo) console.error('Error al cargar favoritos:', error) })
      .finally(() => { if (activo) setCargadoPara(user.id) })
    return () => { activo = false }
  }, [user, token])

  // Verificar si un producto es favorito
  const esFavorito = (productoId) => {
    return favoritos.some(fav => fav.id === productoId);
  };

  // Toggle: agregar o quitar favorito
  const toggleFavorito = async (producto) => {
    if (!user || !token) return;

    try {
      const { data } = await api.post('/favoritos/toggle', {
        producto_id: producto.id
      });
      
      if (data.accion === 'eliminado') {
        // Quitar de favoritos localmente
        setFavoritos(prev => prev.filter(fav => fav.id !== producto.id));
      } else {
        // Agregar a favoritos localmente con la info del producto
        setFavoritos(prev => [...prev, {
          ...producto,
          favorito_id: data.favorito?.id,
          favorito_creado: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error al toggle favorito:', error);
    }
  };

  const value = {
    favoritos: user && token ? favoritos : [],
    loading: !!(user && token) && cargadoPara !== user.id,
    esFavorito,
    toggleFavorito,
    recargarFavoritos: cargarFavoritos
  };

  return (
    <FavoritosContext.Provider value={value}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const context = useContext(FavoritosContext);
  if (!context) {
    throw new Error('useFavoritos debe usarse dentro de un FavoritosProvider');
  }
  return context;
}