// src/pages/VerificarDocumento.jsx
//
// Página pública `/verificar/:tipo/:id?c=CODIGO`: la landing de los QR de las
// facturas y de los comprobantes de pago. Quien escanea el papel puede ser el
// cliente final, el de la farmacia que lo atendió, o cualquiera con el
// documento en la mano — nadie tiene sesión ni la necesita. Lo que prueba que
// el papel es real es el código HMAC que el backend recalcula contra el
// registro de la base de datos.
//
// Si el código no cuadra NO se dice "documento falso" con seguridad: se dice
// que el código no coincide, que es lo único que se puede afirmar. Alguien
// puede haber impreso un PDF viejo (código válido, datos que ya cambiaron) o
// estar escaneando una copia manipulada.
//
// Usa `publicApi`, NO el `api` de cliente: su interceptor de 401 cierra la
// sesión y redirige al login, y acá un 401 es un papel con código inválido.

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, Loader2, FileText, RefreshCw, Home, Ban,
} from 'lucide-react'
import publicApi from '../api/publicApi'
import empresaInfo from '../config/empresa'
import './VerificarDocumento.css'

// Texto por `motivo` que devuelve el backend. Todo 4xx/5xx cae aquí.
const MOTIVOS = {
  codigo_requerido: {
    titulo: 'Enlace incompleto',
    detalle: 'Este enlace no trae el código de verificación. Escanea directamente el código QR del documento.',
  },
  codigo_invalido: {
    titulo: 'El código no coincide',
    detalle:
      'La verificación falló. Puede ser una copia impresa antes de una actualización del documento, ' +
      'o un documento que no fue emitido por nosotros. En caso de duda, confirma con la empresa.',
  },
  no_encontrado: {
    titulo: 'Documento no encontrado',
    detalle: 'No hay ningún documento con ese número registrado en la plataforma.',
  },
  tipo_no_soportado: {
    titulo: 'Tipo no verificable',
    detalle: 'Por hoy solo se pueden verificar facturas y comprobantes de pago.',
  },
  id_invalido: {
    titulo: 'Enlace mal formado',
    detalle: 'El número de documento que trae el enlace no es válido.',
  },
  servicio_no_disponible: {
    titulo: 'Servicio temporalmente caído',
    detalle:
      'La verificación no está disponible en este momento. No significa que el documento sea inválido: ' +
      'inténtalo de nuevo en unos minutos.',
  },
  error_del_servidor: {
    titulo: 'Error de verificación',
    detalle: 'No pudimos completar la consulta. Inténtalo de nuevo más tarde.',
  },
}

function monto(m) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(Number(m) || 0)
}

function fecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function VerificarDocumento() {
  const { tipo, id } = useParams()
  const [params] = useSearchParams()
  const codigo = params.get('c')

  const [estado, setEstado] = useState('cargando') // cargando | valido | invalido
  const [datos, setDatos] = useState(null)
  const [motivo, setMotivo] = useState('')

  // El reset depende de la URL, así que va en el render (no en el efecto):
  // `react-hooks/set-state-in-effect` marca cualquier setState directo en el
  // cuerpo del efecto. Guardamos la clave anterior y nos re-renderizamos.
  const clave = `${tipo}/${id}/${codigo || ''}`
  const [claveAnterior, setClaveAnterior] = useState(clave)
  if (clave !== claveAnterior) {
    setClaveAnterior(clave)
    setEstado('cargando')
    setMotivo('')
    setDatos(null)
  }

  useEffect(() => {
    // Sin código no se llama al backend: el `motivo` lo sabemos de antemano y
    // un fetch con `?c=` vacío solo gastaría el rate limit público. El estado
    // "inválido" en ese caso se DERIVA en el render (abajo), no se guarda.
    if (!codigo) return

    let activo = true

    // Cadena de .then() a propósito: `react-hooks/set-state-in-effect` marca
    // cualquier async con setState aunque el setState esté después del await.
    publicApi
      .get(`/verificar/${tipo}/${id}`, { params: { c: codigo } })
      .then(({ data }) => {
        if (!activo) return
        setDatos(data)
        setEstado(data.valido ? 'valido' : 'invalido')
        if (!data.valido) setMotivo(data.motivo || '')
      })
      .catch((err) => {
        if (!activo) return
        setEstado('invalido')
        setMotivo(err.response?.data?.motivo || 'error_del_servidor')
      })

    return () => { activo = false }
  }, [tipo, id, codigo])

  // Un enlace sin `?c=` es inválido por definición: no depende del fetch.
  const sinCodigo = !codigo
  const estadoActual = sinCodigo ? 'invalido' : estado
  const motivoActual = sinCodigo ? 'codigo_requerido' : motivo
  const valido = estadoActual === 'valido'
  const info = MOTIVOS[motivoActual] || MOTIVOS.error_del_servidor
  // El QR prueba que el papel NO fue alterado, no que el documento siga vigente.
  // Una factura anulada es auténtica y a la vez está anulada: decirlo es lo honesto.
  const anulado = valido && datos?.estado === 'anulada'

  return (
    <div className="vd">
      <header className="vd__header">
        <div className="vd__marca">
          <div className="vd__logo" aria-hidden="true" />
          <div>
            <strong className="vd__nombre">{empresaInfo.nombre}</strong>
            <span className="vd__tagline">{empresaInfo.tagline}</span>
          </div>
        </div>
      </header>

      <main className="vd__main">
        {estado === 'cargando' && (
          <div className="vd-card vd-card--cargando">
            <Loader2 size={32} className="vd__spin" />
            <p className="vd-card__titulo">Verificando documento…</p>
            <p className="vd-card__texto">Consultando los registros de la plataforma.</p>
          </div>
        )}

        {estado === 'invalido' && (
          <div className="vd-card vd-card--invalido">
            <div className="vd-card__icono"><ShieldAlert size={34} /></div>
            <p className="vd-card__titulo">{info.titulo}</p>
            <p className="vd-card__texto">{info.detalle}</p>
            <button
              type="button"
              className="vd-btn vd-btn--ghost"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={15} />
              Intentar de nuevo
            </button>
          </div>
        )}

        {valido && datos && (
          <>
            <div className={`vd-card ${anulado ? 'vd-card--anulado' : 'vd-card--valido'}`}>
              <div className="vd-card__icono">
                {anulado ? <Ban size={34} /> : <ShieldCheck size={34} />}
              </div>
              <p className="vd-card__titulo">
                {anulado ? 'Documento auténtico, pero ANULADO' : 'Documento auténtico'}
              </p>
              <p className="vd-card__texto">
                {anulado ? (
                  <>
                    Este documento sí fue emitido por {empresaInfo.nombre} y sus datos coinciden
                    con nuestros registros, <strong>pero fue anulado</strong> y no tiene validez
                    para exigir pago ni reclamar nada. No lo use como respaldo de una deuda.
                  </>
                ) : (
                  <>
                    Este {datos.tipo === 'factura' ? 'documento fue emitido' : 'comprobante fue registrado'}{' '}
                    por {empresaInfo.nombre} y sus datos coinciden con los de nuestros registros.
                  </>
                )}
              </p>
            </div>

            <dl className="vd-datos">
              <div className="vd-datos__item">
                <dt><FileText size={14} /> Documento</dt>
                <dd>{datos.folio}</dd>
              </div>
              <div className="vd-datos__item">
                <dt>Fecha</dt>
                <dd>{fecha(datos.emitido)}</dd>
              </div>
              <div className="vd-datos__item">
                <dt>Monto</dt>
                <dd className="vd-datos__monto">{monto(datos.monto)}</dd>
              </div>
              <div className="vd-datos__item">
                <dt>Cliente</dt>
                <dd>{datos.cliente?.nombre || '—'}</dd>
              </div>
              <div className="vd-datos__item">
                <dt>Estado</dt>
                <dd className={`vd-datos__estado${anulado ? ' vd-datos__estado--anulada' : ''}`}>
                  {datos.estado}
                </dd>
              </div>
            </dl>

            <p className="vd-nota">
              Por privacidad solo se muestra el nombre enmascarado del cliente. Este resultado
              confirma que el documento es real; el monto y el estado son los registrados hoy
              en la plataforma.
            </p>
          </>
        )}
      </main>

      <footer className="vd__footer">
        <p>{empresaInfo.descripcion}</p>
        <p className="vd__footer-contacto">
          {[empresaInfo.rif && `RIF ${empresaInfo.rif}`, empresaInfo.telefono, empresaInfo.email]
            .filter(Boolean).join('   ·   ')}
        </p>
        {empresaInfo.direccion && <p className="vd__footer-contacto">{empresaInfo.direccion}</p>}
        <Link to="/home" className="vd-btn vd-btn--ghost">
          <Home size={15} />
          Ir al sitio
        </Link>
      </footer>
    </div>
  )
}