import { useAuth } from '../context/AuthContext';
import CatalogoAcceso from './CatalogoAcceso';

// Requiere sesión solo para VER: no cambia la URL ni la página, para que
// /catalogo y /producto/:id sigan siendo compartibles por WhatsApp (el
// receptor sin sesión ve la pantalla de acceso y, al entrar, cae en el
// mismo producto).
export default function ConSesionCatalogo({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <CatalogoAcceso />;
  return children;
}