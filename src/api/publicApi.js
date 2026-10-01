import axios from 'axios';

// Cliente HTTP para endpoints PÚBLICOS que no llevan sesión.
//
// NO usar `src/api/axios.js` aquí: ese interceptor de respuesta convierte
// cualquier 401 en "borrar token + redirigir a /login?expirado=1". En la página
// de verificación un 401 significa "el código del QR no coincide" (documento
// falso o copia manipulada), no "sesión expirada": usar `api` expulsaría al
// usuario de su sesión y lo mandaría al login por haber escaneado un papel
// falso. Aquí tampoco se manda Authorization: el código HMAC es la única
// prueba, y no debe viajar un JWT de más.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default publicApi;