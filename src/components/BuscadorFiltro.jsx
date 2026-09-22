import { useState, useEffect, useRef } from 'react'

function BuscadorFiltro({ marcas, onFiltrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [marcaId, setMarcaId] = useState('')
  const onFiltrarRef = useRef(onFiltrar)

  useEffect(() => {
    onFiltrarRef.current = onFiltrar
  })

  // Debounce: esperamos 500ms después de la última tecla antes de disparar el filtro
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltrarRef.current({ search: busqueda, marca_id: marcaId })
    }, 500)

    // Cleanup: si el usuario tipea de nuevo antes de los 500ms,
    // cancelamos el timer anterior y arrancamos uno nuevo
    return () => clearTimeout(timer)
  }, [busqueda, marcaId])

  return (
    <div className="buscador-filtro">
      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)}>
        <option value="">Todas las marcas</option>
        {marcas.map((marca) => (
          <option key={marca.id} value={marca.id}>
            {marca.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}

export default BuscadorFiltro