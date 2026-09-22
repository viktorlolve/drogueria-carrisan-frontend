import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaPicker.css';

// Corrige el problema común de íconos rotos de Leaflet con bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Centro por defecto: Valencia, Carabobo. Cámbialo con la prop initialPosition.
const CENTRO_DEFECTO = { lat: 10.1620, lng: -67.9944 };
const ZOOM_DEFECTO = 13;

const parsearDireccion = (data) => {
  const a = data.address || {};
  const calle = a.road || a.pedestrian || a.footway || '';
  const sector = a.suburb || a.neighbourhood || a.quarter || '';
  const ciudad = a.city || a.town || a.village || a.municipality || '';
  const estado = a.state || '';
  const resumen =
    [calle, sector, ciudad, estado].filter(Boolean).join(', ') ||
    data.display_name ||
    'Ubicación sin nombre de calle disponible';
  return { calle, sector, ciudad, estado, resumen, raw: data.display_name || '' };
};

const reverseGeocodeNominatim = async (lat, lng) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { 'Accept-Language': 'es' } }
  );
  if (!res.ok) throw new Error('nominatim-fail');
  return parsearDireccion(await res.json());
};

/**
 * MapaPicker
 * Selector de dirección sobre un mapa Leaflet, con geocodificación inversa
 * gratuita: usa LocationIQ si se provee apiKey (5000 solicitudes/día gratis),
 * y cae automáticamente a Nominatim/OpenStreetMap si no hay key o falla.
 *
 * Props:
 * - apiKey           (string, opcional) API key gratuita de LocationIQ.
 * - initialPosition  ({lat, lng}, opcional) posición inicial del marcador.
 * - onSelect         (function) recibe { lat, lng, direccion, detalle }
 *                     cada vez que se confirma una ubicación.
 */
export default function MapaPicker({ apiKey, initialPosition, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const debounceRef = useRef(null);

  const [position, setPosition] = useState(initialPosition || CENTRO_DEFECTO);
  const [direccion, setDireccion] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);

  // --- Geocodificación inversa: coordenadas -> dirección ---
  const reverseGeocode = useCallback(async (lat, lng) => {
    setLoading(true);
    setError('');
    try {
      let resultado;
      if (apiKey) {
        try {
          const res = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&addressdetails=1`
          );
          if (!res.ok) throw new Error('locationiq-fail');
          resultado = parsearDireccion(await res.json());
        } catch {
          resultado = await reverseGeocodeNominatim(lat, lng); // respaldo automático
        }
      } else {
        resultado = await reverseGeocodeNominatim(lat, lng);
      }
      setDireccion(resultado.resumen);
      setDetalle(resultado);
    } catch {
      setError('No se pudo obtener la dirección automáticamente. Puedes escribirla manualmente.');
      setDireccion('');
      setDetalle(null);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // --- Búsqueda de direcciones para el buscador (autocompletar) ---
  const buscarDireccion = useCallback((texto) => {
    clearTimeout(debounceRef.current);
    if (!texto || texto.length < 4) {
      setSugerencias([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = apiKey
          ? `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(texto + ', Venezuela')}&format=json&countrycodes=ve&limit=5`
          : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto + ', Venezuela')}&format=json&countrycodes=ve&limit=5`;
        const res = await fetch(url, apiKey ? undefined : { headers: { 'Accept-Language': 'es' } });
        const data = await res.json();
        setSugerencias(Array.isArray(data) ? data : []);
      } catch {
        setSugerencias([]);
      }
    }, 500);
  }, [apiKey]);

  const moverA = (lat, lng) => {
    setPosition({ lat, lng });
    mapInstance.current?.setView([lat, lng], 17);
    markerRef.current?.setLatLng([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const seleccionarSugerencia = (s) => {
    setQuery(s.display_name);
    setSugerencias([]);
    moverA(parseFloat(s.lat), parseFloat(s.lon));
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      moverA(pos.coords.latitude, pos.coords.longitude);
    });
  };

  // --- Inicializar el mapa una sola vez ---
  useEffect(() => {
    if (mapInstance.current) return;

    const map = L.map(mapRef.current).setView([position.lat, position.lng], ZOOM_DEFECTO);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([position.lat, position.lng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });

    mapInstance.current = map;
    markerRef.current = marker;
    reverseGeocode(position.lat, position.lng);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Notificar al componente padre cuando cambia la selección ---
  useEffect(() => {
    if (!onSelect || !detalle) return;
    onSelect({ lat: position.lat, lng: position.lng, direccion, detalle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccion, detalle]);

  return (
    <div className="mapa-picker">
      <div className="mapa-picker__buscador">
        <input
          type="text"
          value={query}
          placeholder="Busca una calle, sector o punto de referencia…"
          onChange={(e) => {
            setQuery(e.target.value);
            buscarDireccion(e.target.value);
          }}
        />
        <button
          type="button"
          className="mapa-picker__ubicacion-btn"
          onClick={usarMiUbicacion}
          title="Usar mi ubicación actual"
        >
          📍
        </button>
        {sugerencias.length > 0 && (
          <ul className="mapa-picker__sugerencias">
            {sugerencias.map((s) => (
              <li key={s.place_id} onClick={() => seleccionarSugerencia(s)}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={mapRef} className="mapa-picker__mapa" />

      <div className="mapa-picker__resultado">
        {loading && <p className="mapa-picker__estado">Buscando dirección…</p>}
        {!loading && error && (
          <p className="mapa-picker__estado mapa-picker__estado--error">{error}</p>
        )}
        {!loading && !error && direccion && (
          <p className="mapa-picker__direccion">
            <strong>Dirección seleccionada:</strong> {direccion}
          </p>
        )}
        <p className="mapa-picker__coords">
          Lat: {position.lat.toFixed(6)} · Lng: {position.lng.toFixed(6)}
        </p>
        {!detalle?.calle && !loading && (
          <p className="mapa-picker__aviso">
            No se detectó el nombre de la calle automáticamente. Mueve el marcador a un punto de
            referencia cercano o completa la dirección manualmente en el formulario.
          </p>
        )}
      </div>
    </div>
  );
}
