import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import staffApi from '../api/staffAxios';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

const StaffAuthContext = createContext();

function isTokenValid(token) {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function StaffAuthProvider({ children }) {
  const [token, setToken] = useState(() => safeGetItem('staff_token'));
  const [staff, setStaff] = useState(() => {
    if (!token) return null;
    if (!isTokenValid(token)) {
      safeRemoveItem('staff_token');
      safeRemoveItem('staff_user');
      return null;
    }
    try {
      const guardado = safeGetItem('staff_user');
      if (guardado) {
        try { return JSON.parse(guardado); } catch { return jwtDecode(token); }
      }
      return jwtDecode(token);
    } catch {
      return null;
    }
  });
  const [loading] = useState(false);

  // El JWT de staff vive 7 días y lleva dentro el `rol` con el que se emitió,
  // así que el perfil guardado en localStorage puede quedar viejo: un ascenso
  // no se vería en el sidebar (ni en los guards de PrivateRouteStaff) hasta el
  // siguiente login. GET /staff/me devuelve el rol actual de la BD y sobrescribe
  // `staff_user` solo si algo cambió de verdad (evita re-renders inútiles).
  //
  // Nota: si el staff fue desactivado o su token revocado, /staff/me responde
  // 401/403 y el interceptor de staffAxios limpia la sesión y manda a
  // /staff/login?expirado=1 — el comportamiento correcto.
  useEffect(() => {
    if (!token) return undefined;

    let cancelado = false;
    staffApi.get('/staff/me')
      .then(({ data }) => {
        if (cancelado || !data?.staff) return;
        const fresco = data.staff;
        let guardado;
        try { guardado = JSON.parse(safeGetItem('staff_user')); } catch { guardado = null; }
        const sinCambios = guardado
          && guardado.rol === fresco.rol
          && guardado.nombre === fresco.nombre
          && guardado.email === fresco.email;
        if (sinCambios) return;
        safeSetItem('staff_user', JSON.stringify(fresco));
        setStaff(fresco);
      })
      .catch(() => { /* sesión caída o red: el interceptor 401 ya limpia */ });

    return () => { cancelado = true; };
  }, [token]);

  // Guarda una sesión staff ya autenticada ({ token, staff }). Lo usa el
  // login y también el registro staff (el backend devuelve token+staff y
  // así se evita un doble POST).
  function iniciarSesionConDatos({ token, staff }) {
    safeSetItem('staff_token', token);
    safeSetItem('staff_user', JSON.stringify(staff));
    setToken(token);
    setStaff(staff);
    return staff;
  }

  async function loginStaff(email, password) {
    const { data } = await staffApi.post('/staff/login', { email, password });
    return iniciarSesionConDatos(data);
  }

  function logoutStaff() {
    safeRemoveItem('staff_token');
    safeRemoveItem('staff_user');
    setToken(null);
    setStaff(null);
  }

  return (
    <StaffAuthContext.Provider value={{ staff, token, loading, loginStaff, logoutStaff, iniciarSesionConDatos }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}