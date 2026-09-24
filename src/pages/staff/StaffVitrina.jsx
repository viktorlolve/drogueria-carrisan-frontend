import { useEffect, useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import './StaffVitrina.css'

const BLOQUES = [
  { id: 'hero', label: 'Hero' },
  { id: 'cargas', label: 'Cargas' },
  { id: 'promos', label: 'Promos' },
  { id: 'bento', label: 'Bento' },
  { id: 'carruseles', label: 'Carruseles' },
]

export default function StaffVitrina() {
  const [bloqueActivo, setBloqueActivo] = useState('hero')
  const [configs, setConfigs] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    staffApi
      .get('/staff/vitrina')
      .then((res) => setConfigs(res.data && typeof res.data === 'object' ? res.data : {}))
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la vitrina'))
      .finally(() => setCargando(false))
  }, [])

  const configActual = configs[bloqueActivo] || {}

  function setBloqueConfig(next) {
    setConfigs((prev) => ({ ...prev, [bloqueActivo]: next }))
  }

  async function guardar() {
    setError('')
    setGuardando(true)
    try {
      await staffApi.put(`/staff/vitrina/${bloqueActivo}`, { config: configActual })
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function restaurar() {
    if (!window.confirm(`¿Restaurar el bloque "${bloqueActivo}" a los defaults del Home?`)) return
    setError('')
    try {
      await staffApi.delete(`/staff/vitrina/${bloqueActivo}`)
      setConfigs((prev) => { const next = { ...prev }; delete next[bloqueActivo]; return next })
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restaurar')
    }
  }

  if (cargando) return <LayoutDepartamento departamento="comercial" activo="vitrina" titulo="Vitrina"><div className="sv-cargando">Cargando…</div></LayoutDepartamento>

  return (
    <LayoutDepartamento departamento="comercial" activo="vitrina" titulo="Vitrina">
      <div className="sv">
        <StaffTabs
          tabs={BLOQUES.map((b) => ({ id: b.id, texto: b.label }))}
          activo={bloqueActivo}
          onChange={setBloqueActivo}
        />
        <div className="sv-toolbar">
          <button type="button" className="sv-btn sv-btn--guardar" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar bloque'}
          </button>
          <button type="button" className="sv-btn sv-btn--restaurar" onClick={restaurar}>
            Restaurar default
          </button>
        </div>
        {error && <div className="sv-error">{error}</div>}
        {bloqueActivo === 'hero' && <EditorHero config={configActual} onChange={setBloqueConfig} />}
        {bloqueActivo === 'cargas' && <EditorCargas config={configActual} onChange={setBloqueConfig} />}
        {bloqueActivo === 'promos' && <EditorPromos config={configActual} onChange={setBloqueConfig} />}
        {bloqueActivo === 'bento' && <EditorBento config={configActual} onChange={setBloqueConfig} />}
        {bloqueActivo === 'carruseles' && <EditorCarruseles config={configActual} onChange={setBloqueConfig} />}
      </div>
    </LayoutDepartamento>
  )
}

function EditorHero({ config, onChange }) {
  const [slides, setSlides] = useState(config.slides || [])
  useEffect(() => { setSlides(config.slides || []) }, [config])

  function actualizar(idx, campo, valor) {
    const next = slides.map((s, i) => (i === idx ? { ...s, [campo]: valor } : s))
    setSlides(next)
    onChange({ slides: next })
  }
  function agregar() {
    const next = [...slides, { id: Date.now(), imagen: '', alt: '', titulo: '', subtitulo: '', botonTexto: '', botonLink: '' }]
    setSlides(next)
    onChange({ slides: next })
  }
  function quitar(idx) {
    const next = slides.filter((_, i) => i !== idx)
    setSlides(next)
    onChange({ slides: next })
  }

  return (
    <div className="sv-editor">
      <button type="button" className="sv-btn" onClick={agregar}>+ Agregar slide</button>
      {slides.map((s, idx) => (
        <div key={s.id || idx} className="sv-card">
          <div className="sv-card-head">
            <strong>Slide {idx + 1}</strong>
            <button type="button" className="sv-link" onClick={() => quitar(idx)}>Quitar</button>
          </div>
          <label className="sv-field"><span>Imagen (URL)</span>
            <input value={s.imagen || ''} onChange={(e) => actualizar(idx, 'imagen', e.target.value)} />
          </label>
          <label className="sv-field"><span>Alt</span>
            <input value={s.alt || ''} onChange={(e) => actualizar(idx, 'alt', e.target.value)} />
          </label>
          <label className="sv-field"><span>Título</span>
            <input value={s.titulo || ''} onChange={(e) => actualizar(idx, 'titulo', e.target.value)} />
          </label>
          <label className="sv-field"><span>Subtítulo</span>
            <input value={s.subtitulo || ''} onChange={(e) => actualizar(idx, 'subtitulo', e.target.value)} />
          </label>
          <div className="sv-row">
            <label className="sv-field"><span>Texto botón</span>
              <input value={s.botonTexto || ''} onChange={(e) => actualizar(idx, 'botonTexto', e.target.value)} />
            </label>
            <label className="sv-field"><span>Link botón</span>
              <input value={s.botonLink || ''} onChange={(e) => actualizar(idx, 'botonLink', e.target.value)} />
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

function EditorCargas({ config, onChange }) {
  const [cargas, setCargas] = useState(config.cargas || [])
  useEffect(() => { setCargas(config.cargas || []) }, [config])

  function actualizar(idx, campo, valor) {
    const next = cargas.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c))
    setCargas(next)
    onChange({ cargas: next })
  }
  function agregar() {
    const next = [...cargas, { id: `carga-${Date.now()}`, titulo: '', modo: 'laboratorio', valor: [''], categoria: '' }]
    setCargas(next)
    onChange({ cargas: next })
  }
  function quitar(idx) {
    const next = cargas.filter((_, i) => i !== idx)
    setCargas(next)
    onChange({ cargas: next })
  }

  return (
    <div className="sv-editor">
      <button type="button" className="sv-btn" onClick={agregar}>+ Agregar carga</button>
      {cargas.map((c, idx) => (
        <div key={c.id || idx} className="sv-card">
          <div className="sv-card-head">
            <strong>Carga {idx + 1}</strong>
            <button type="button" className="sv-link" onClick={() => quitar(idx)}>Quitar</button>
          </div>
          <label className="sv-field"><span>Título del carrusel</span>
            <input value={c.titulo || ''} onChange={(e) => actualizar(idx, 'titulo', e.target.value)} />
          </label>
          <label className="sv-field"><span>Modo de pool</span>
            <select value={c.modo || 'laboratorio'} onChange={(e) => actualizar(idx, 'modo', e.target.value)}>
              <option value="laboratorio">Por laboratorio</option>
              <option value="molecula">Por molécula</option>
              <option value="lista">Lista manual (ids)</option>
            </select>
          </label>
          {c.modo === 'lista' ? (
            <label className="sv-field"><span>IDs (separados por coma)</span>
              <input value={Array.isArray(c.valor) ? c.valor.join(',') : c.valor || ''}
                onChange={(e) => actualizar(idx, 'valor', e.target.value.split(',').map((s) => s.trim()).filter(Boolean).map(Number))} />
            </label>
          ) : (
            <label className="sv-field">
              <span>{c.modo === 'molecula' ? 'Molécula (término de búsqueda)' : 'Laboratorio (parcial) — separá varios con coma para exacto'}</span>
              <input value={Array.isArray(c.valor) ? c.valor.join(',') : c.valor || ''}
                onChange={(e) => actualizar(idx, 'valor', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
            </label>
          )}
          {c.modo === 'laboratorio' && (
            <label className="sv-field"><span>Categoría opcional (slug, ej. hospitalario)</span>
              <input value={c.categoria || ''} onChange={(e) => actualizar(idx, 'categoria', e.target.value)} />
            </label>
          )}
          <div className="sv-card-head sv-card-head--sub">
            <strong>Promo de la carga</strong>
          </div>
          <label className="sv-field"><span>Imagen promo (URL)</span>
            <input value={c.promo?.imagen || ''} onChange={(e) => actualizar(idx, 'promo', { ...(c.promo || {}), imagen: e.target.value })} />
          </label>
          <label className="sv-field"><span>Alt promo</span>
            <input value={c.promo?.alt || ''} onChange={(e) => actualizar(idx, 'promo', { ...(c.promo || {}), alt: e.target.value })} />
          </label>
          <label className="sv-field"><span>Título del carrusel de promo</span>
            <input value={c.promo?.tituloCarrusel || ''} onChange={(e) => actualizar(idx, 'promo', { ...(c.promo || {}), tituloCarrusel: e.target.value })} />
          </label>
          <label className="sv-field"><span>Laboratorio de promo (filtra productos del carrusel)</span>
            <input value={c.promo?.laboratorio || ''} onChange={(e) => actualizar(idx, 'promo', { ...(c.promo || {}), laboratorio: e.target.value })} />
          </label>
        </div>
      ))}
    </div>
  )
}

function SeccionEditor({ label, valor, setValor }) {
  return (
    <div className="sv-card">
      <div className="sv-card-head"><strong>{label}</strong></div>
      <label className="sv-field"><span>Imagen (URL)</span>
        <input value={valor.imagen || ''} onChange={(e) => setValor({ ...valor, imagen: e.target.value })} />
      </label>
      <label className="sv-field"><span>Alt</span>
        <input value={valor.alt || ''} onChange={(e) => setValor({ ...valor, alt: e.target.value })} />
      </label>
      <label className="sv-check"><input type="checkbox" checked={valor.visible !== false} onChange={(e) => setValor({ ...valor, visible: e.target.checked })} /> Visible</label>
    </div>
  )
}

function ListaEditor({ titulo, items, setItems, campos }) {
  function agregar() {
    const base = {}
    campos.forEach(([campo]) => { base[campo] = '' })
    setItems([...items, { id: `${titulo}-${Date.now()}`, ...base, visible: true }])
  }
  return (
    <div className="sv-card">
      <div className="sv-card-head">
        <strong>{titulo}</strong>
        <button type="button" className="sv-link" onClick={agregar}>+ Agregar</button>
      </div>
      {items.map((it, idx) => (
        <div key={it.id} className="sv-subcard">
          <div className="sv-card-head">
            <span>{it.id}</span>
            <button type="button" className="sv-link" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Quitar</button>
          </div>
          {campos.map(([campo, label]) => (
            <label key={campo} className="sv-field"><span>{label}</span>
              <input value={it[campo] || ''} onChange={(e) => {
                const next = items.map((x, i) => (i === idx ? { ...x, [campo]: e.target.value } : x))
                setItems(next)
              }} />
            </label>
          ))}
          <label className="sv-check"><input type="checkbox" checked={it.visible !== false} onChange={(e) => {
            const next = items.map((x, i) => (i === idx ? { ...x, visible: e.target.checked } : x))
            setItems(next)
          }} /> Visible</label>
        </div>
      ))}
    </div>
  )
}

function EditorPromos({ config, onChange }) {
  const [seccion1, setSeccion1] = useState(config.seccion1 || { imagen: '', alt: '', visible: true })
  const [seccion2, setSeccion2] = useState(config.seccion2 || { imagen: '', alt: '', visible: true })
  const [rotativo, setRotativo] = useState(config.rotativo || [])
  const [adsPar, setAdsPar] = useState(config.adsPar || [])

  useEffect(() => {
    setSeccion1(config.seccion1 || { imagen: '', alt: '', visible: true })
    setSeccion2(config.seccion2 || { imagen: '', alt: '', visible: true })
    setRotativo(config.rotativo || [])
    setAdsPar(config.adsPar || [])
  }, [config])

  function push() {
    const next = { seccion1, seccion2, rotativo, adsPar }
    onChange(next)
  }
  useEffect(() => { push() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [seccion1, seccion2, rotativo, adsPar])

  return (
    <div className="sv-editor">
      <SeccionEditor label="Sección promocional #1 (superior)" valor={seccion1} setValor={setSeccion1} />
      <SeccionEditor label="Sección promocional #2 (inferior, invertida)" valor={seccion2} setValor={setSeccion2} />
      <ListaEditor titulo="AdRotativo (banner deslizante)" items={rotativo} setItems={setRotativo}
        campos={[['imagenDesktop', 'Imagen desktop (URL)'], ['imagenMovil', 'Imagen móvil (URL)'], ['alt', 'Alt'], ['link', 'Link']]} />
      <ListaEditor titulo="Ads en par (inferior)" items={adsPar} setItems={setAdsPar}
        campos={[['imagen', 'Imagen (URL)'], ['alt', 'Alt'], ['link', 'Link']]} />
    </div>
  )
}

function EditorBento({ config, onChange }) {
  const [bloques, setBloques] = useState(config.bloques || [])
  useEffect(() => { setBloques(config.bloques || []) }, [config])
  const IDs = ['home__bloque-a', 'home__bloque-b', 'home__bloque-c', 'home__bloque-e', 'home__bloque-d']

  function actualizar(id, campo, valor) {
    const next = bloques.map((b) => (b.id === id ? { ...b, [campo]: valor } : b))
    setBloques(next)
    onChange({ bloques: next })
  }
  function agregar(id) {
    if (bloques.some((b) => b.id === id)) return
    const next = [...bloques, { id, imagen: '', titulo: '', subtitulo: '', textoCta: '', link: '', tamano: 'mediano', posicionTexto: 'abajo', estiloCta: 'boton', visible: true }]
    setBloques(next)
    onChange({ bloques: next })
  }
  function quitar(id) {
    const next = bloques.filter((b) => b.id !== id)
    setBloques(next)
    onChange({ bloques: next })
  }

  return (
    <div className="sv-editor">
      {IDs.map((id) => {
        const actual = bloques.find((b) => b.id === id)
        return (
          <div key={id} className="sv-card">
            <div className="sv-card-head">
              <strong>{id}</strong>
              {actual ? (
                <button type="button" className="sv-link" onClick={() => quitar(id)}>Usar default</button>
              ) : (
                <button type="button" className="sv-link" onClick={() => agregar(id)}>+ Personalizar</button>
              )}
            </div>
            {!actual && <p className="sv-hint">Sin config → se usa el bloque default del Home.</p>}
            {actual && (
              <>
                <label className="sv-field"><span>Imagen (URL)</span>
                  <input value={actual.imagen || ''} onChange={(e) => actualizar(id, 'imagen', e.target.value)} />
                </label>
                <label className="sv-field"><span>Título</span>
                  <input value={actual.titulo || ''} onChange={(e) => actualizar(id, 'titulo', e.target.value)} />
                </label>
                <label className="sv-field"><span>Subtítulo</span>
                  <input value={actual.subtitulo || ''} onChange={(e) => actualizar(id, 'subtitulo', e.target.value)} />
                </label>
                <div className="sv-row">
                  <label className="sv-field"><span>Texto CTA</span>
                    <input value={actual.textoCta || ''} onChange={(e) => actualizar(id, 'textoCta', e.target.value)} />
                  </label>
                  <label className="sv-field"><span>Link CTA</span>
                    <input value={actual.link || ''} onChange={(e) => actualizar(id, 'link', e.target.value)} />
                  </label>
                </div>
                <label className="sv-field"><span>Estilo CTA</span>
                  <select value={actual.estiloCta || 'boton'} onChange={(e) => actualizar(id, 'estiloCta', e.target.value)}>
                    <option value="boton">Botón</option>
                    <option value="enlace">Enlace</option>
                  </select>
                </label>
                <label className="sv-check"><input type="checkbox" checked={actual.visible !== false} onChange={(e) => actualizar(id, 'visible', e.target.checked)} /> Visible</label>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EditorCarruseles({ config, onChange }) {
  const [secciones, setSecciones] = useState(config.secciones || [])
  useEffect(() => { setSecciones(config.secciones || []) }, [config])

  const DEFAULT_SECCIONES = [
    { id: 'ofertas', titulo: 'Ofertas destacadas' },
    { id: 'rollbacks', titulo: 'Rollbacks y más' },
    { id: 'rollbacks2', titulo: 'Más rollbacks' },
    { id: 'recomendados', titulo: 'Recomendados para ti' },
  ]

  function calcularSecciones() {
    const porId = {}
    secciones.forEach((s) => { porId[s.id] = s })
    return DEFAULT_SECCIONES.map((d) => ({ ...d, ...(porId[d.id] || {}), visible: porId[d.id] ? porId[d.id].visible !== false : true }))
  }

  function aplicar(next) {
    setSecciones(next)
    onChange({ secciones: next })
  }
  function cambiar(id, campo, valor) {
    const vista = calcularSecciones()
    const idx = vista.findIndex((s) => s.id === id)
    if (idx === -1) return
    vista[idx] = { ...vista[idx], [campo]: valor }
    aplicar(vista)
  }

  return (
    <div className="sv-editor">
      {calcularSecciones().map((s) => (
        <div key={s.id} className="sv-card">
          <div className="sv-card-head"><strong>{s.id}</strong></div>
          <label className="sv-field"><span>Título</span>
            <input value={s.titulo || ''} onChange={(e) => cambiar(s.id, 'titulo', e.target.value)} />
          </label>
          <label className="sv-check"><input type="checkbox" checked={s.visible} onChange={(e) => cambiar(s.id, 'visible', e.target.checked)} /> Visible</label>
        </div>
      ))}
    </div>
  )
}