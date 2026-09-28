// src/data/gestionUnaSolaCuentaEquipo.js
const gestionEquipoInfo = {
  etiqueta: 'Tu equipo',
  etiquetaIcono: 'Users',
  titulo: 'Gestión en una sola cuenta para tu equipo',
  subtitulo: 'Todo tu equipo puede generar pedidos, mientras tú mantienes el control desde una sola cuenta.',
  tipo: 'lista',
  contenido: [
    {
      icono: 'Users',
      titulo: 'Sub-usuarios con su PIN de compra',
      // TODO: confirmar mecanismo real (PIN, usuario/clave propio, etc.)
      texto: 'Cada persona de tu equipo puede generar pedidos identificados para mejor gestion de pedidos.',
    },
    {
      icono: 'FileText',
      titulo: 'Un solo estado de cuenta',
      texto: 'Todos los pedidos del equipo se consolidan bajo la misma línea de crédito y facturación.',
    },
    {
      icono: 'ShieldCheck',
      titulo: 'Control centralizado',
      texto: 'El dueño de la cuenta ve y administra todos los movimientos, sin importar quién generó cada pedido.',
    },
  ],
}

export default gestionEquipoInfo
