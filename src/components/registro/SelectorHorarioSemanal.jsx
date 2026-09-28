import { useState } from 'react'

// `corto` se usa en móvil (ver .horario-semanal-dia-corto en Auth.css) para
// que el día completo + los dos selectores quepan en una sola línea.
const DIAS = [
  { key: 'lunes', label: 'Lunes', corto: 'Lun' },
  { key: 'martes', label: 'Martes', corto: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', corto: 'Mié' },
  { key: 'jueves', label: 'Jueves', corto: 'Jue' },
  { key: 'viernes', label: 'Viernes', corto: 'Vie' },
  { key: 'sabado', label: 'Sábado', corto: 'Sáb' },
  { key: 'domingo', label: 'Domingo', corto: 'Dom' }
]

// Opciones de hora en intervalos de 30 min. Guardamos en 24h ("08:30") y
// mostramos 12h compacto ("8:30 am"): el formato largo de toLocaleTimeString
// ("8:30 a. m.") es lo que hace que los <select> no entren en una línea móvil.
function formatearHora12(hora24) {
  const [h, m] = hora24.split(':')
  const h12 = Number(h) % 12 === 0 ? 12 : Number(h) % 12
  return `${h12}:${m} ${Number(h) < 12 ? 'am' : 'pm'}`
}

function generarOpcionesHora() {
  const opciones = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hora24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      opciones.push({ value: hora24, label: formatearHora12(hora24) })
    }
  }
  return opciones
}

const OPCIONES_HORA = generarOpcionesHora()

const HORARIO_POR_DEFECTO = { abierto: true, apertura: '08:00', cierre: '17:00' }

function crearHorarioInicial() {
  const horario = {}
  DIAS.forEach((d) => {
    horario[d.key] = { ...HORARIO_POR_DEFECTO }
  })
  return horario
}

/**
 * Selector de horario semanal de recepción de pedidos.
 * Por cada día: switch abierto/cerrado + hora de apertura/cierre.
 * En móvil cada día se resuelve en 1 línea (switch + día + 2 selectores a
 * ancho completo) y "Copiar a todos" cae en una 2ª línea dentro de la misma
 * tarjeta (ver .horario-semanal-copiar en Auth.css).
 *
 * Props:
 *  - value: objeto { lunes: {abierto, apertura, cierre}, ... } o undefined
 *  - onChange(nuevoValor): callback con el objeto completo actualizado
 */
function SelectorHorarioSemanal({ value, onChange }) {
  const [horario, setHorario] = useState(value || crearHorarioInicial())

  function actualizar(nuevoHorario) {
    setHorario(nuevoHorario)
    onChange(nuevoHorario)
  }

  function toggleDia(diaKey) {
    actualizar({
      ...horario,
      [diaKey]: { ...horario[diaKey], abierto: !horario[diaKey].abierto }
    })
  }

  function cambiarHora(diaKey, campo, valorHora) {
    actualizar({
      ...horario,
      [diaKey]: { ...horario[diaKey], [campo]: valorHora }
    })
  }

  function copiarATodos(diaKey) {
    const plantilla = horario[diaKey]
    const nuevoHorario = {}
    DIAS.forEach((d) => {
      nuevoHorario[d.key] = { ...plantilla }
    })
    actualizar(nuevoHorario)
  }

  return (
    <div className="horario-semanal">
      {DIAS.map((dia) => {
        const config = horario[dia.key]
        return (
          <div key={dia.key} className="horario-semanal-fila">
            <div className="horario-semanal-dia">
              <label className="horario-semanal-switch">
                <input
                  type="checkbox"
                  checked={config.abierto}
                  onChange={() => toggleDia(dia.key)}
                />
                <span className="horario-semanal-switch-track" />
              </label>
              <span className={`horario-semanal-dia-nombre${config.abierto ? '' : ' horario-semanal-dia--cerrado'}`}>
                <span className="horario-semanal-dia-largo">{dia.label}</span>
                <span className="horario-semanal-dia-corto" aria-hidden="true">{dia.corto}</span>
              </span>
            </div>

            {config.abierto ? (
              <div className="horario-semanal-horas">
                <select
                  value={config.apertura}
                  onChange={(e) => cambiarHora(dia.key, 'apertura', e.target.value)}
                  aria-label={`Hora de apertura ${dia.label}`}
                >
                  {OPCIONES_HORA.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
                <span className="horario-semanal-separador">a</span>
                <select
                  value={config.cierre}
                  onChange={(e) => cambiarHora(dia.key, 'cierre', e.target.value)}
                  aria-label={`Hora de cierre ${dia.label}`}
                >
                  {OPCIONES_HORA.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="horario-semanal-cerrado-texto">Cerrado</span>
            )}

            {config.abierto && (
              <button
                type="button"
                className="horario-semanal-copiar"
                onClick={() => copiarATodos(dia.key)}
                title={`Copiar el horario de ${dia.label} a todos los días`}
              >
                Copiar a todos
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SelectorHorarioSemanal
