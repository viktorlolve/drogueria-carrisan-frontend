import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import './CatalogoAcceso.css';

export default function CatalogoAcceso() {
  const location = useLocation();

  // Destino al que Login.jsx vuelve tras entrar: sin esto, quien abre un
  // enlace de /producto/:id por WhatsApp caería en '/' en vez del producto.
  // Solo ruta interna: lo que empiece por '//' o traiga esquema/host sería un
  // open redirect, así que se descarta al construir el state.
  const destino = location.pathname + location.search;
  const from = destino.startsWith('/') && !destino.startsWith('//') ? destino : null;

  return (
    <div className="catalogo-acceso">
      <div className="catalogo-acceso__card">
        <span className="catalogo-acceso__icon"><ShieldCheck size={30} /></span>
        <h1 className="catalogo-acceso__titulo">Catálogo para clientes registrados</h1>
        <p className="catalogo-acceso__texto">
          Somos una plataforma B2B para clínicas, centros quirurgicos y farmacias.
          El catálogo con precios solo está disponible para clientes institucionales registrados.
        </p>
        <p className="catalogo-acceso__texto catalogo-acceso__texto--muted">
          ¿Quieres formar parte de este sistema de abastecimiento? Contactanos.
        </p>
        <div className="catalogo-acceso__acciones">
          <Link
            className="btn-catalogo-acceso btn-catalogo-acceso--primario"
            to="/login"
            state={{ from }}
          >
            <LogIn size={18} /> Iniciar sesión
          </Link>
          <Link className="btn-catalogo-acceso" to="/registro">
            Crear Cuenta B2B
          </Link>
        </div>
      </div>
    </div>
  );
}
