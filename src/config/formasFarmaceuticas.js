// Tips de uso y almacenamiento por forma farmacéutica — se usan para
// generar las "key features" que aparecen debajo del nombre del
// producto en ProductoDetalle. Son indicaciones generales de manejo,
// no reemplazan la posología ni las indicaciones médicas del producto.
const FORMAS_FARMACEUTICAS = {
  tableta: {
    uso: 'Se toma por vía oral, entera con un vaso de agua',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  tabletas: {
    uso: 'Se toma por vía oral, entera con un vaso de agua',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  capsula: {
    uso: 'Se toma por vía oral, entera, sin masticar',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  capsulas: {
    uso: 'Se toma por vía oral, entera, sin masticar',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  'cápsula': {
    uso: 'Se toma por vía oral, entera, sin masticar',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  'cápsulas': {
    uso: 'Se toma por vía oral, entera, sin masticar',
    almacenamiento: 'Guardar en lugar fresco y seco, alejado de la luz solar directa',
  },
  jarabe: {
    uso: 'Se administra por vía oral con la medida dosificadora incluida',
    almacenamiento: 'Conservar en lugar fresco; algunos jarabes requieren refrigeración una vez abiertos',
  },
  suspension: {
    uso: 'Agitar bien antes de usar y administrar con la medida dosificadora',
    almacenamiento: 'Conservar en lugar fresco y seco, protegido de la luz',
  },
  'suspensión': {
    uso: 'Agitar bien antes de usar y administrar con la medida dosificadora',
    almacenamiento: 'Conservar en lugar fresco y seco, protegido de la luz',
  },
  crema: {
    uso: 'Aplicar una capa fina sobre la zona afectada',
    almacenamiento: 'Conservar a temperatura ambiente, bien cerrado tras cada uso',
  },
  'ungüento': {
    uso: 'Aplicar una capa fina sobre la zona afectada',
    almacenamiento: 'Conservar a temperatura ambiente, bien cerrado tras cada uso',
  },
  gel: {
    uso: 'Aplicar una capa fina sobre la zona afectada y dejar secar',
    almacenamiento: 'Conservar a temperatura ambiente, bien cerrado tras cada uso',
  },
  solucion: {
    uso: 'Administrar según la vía indicada en el empaque',
    almacenamiento: 'Conservar en lugar fresco y seco, protegido de la luz',
  },
  'solución': {
    uso: 'Administrar según la vía indicada en el empaque',
    almacenamiento: 'Conservar en lugar fresco y seco, protegido de la luz',
  },
  inyectable: {
    uso: 'Administración exclusivamente por personal de salud calificado',
    almacenamiento: 'Conservar según lo indicado en el empaque; algunos requieren refrigeración',
  },
  gotas: {
    uso: 'Administrar el número de gotas indicado, según la vía correspondiente',
    almacenamiento: 'Conservar en lugar fresco y seco, bien cerrado',
  },
  'óvulos': {
    uso: 'Aplicación vía vaginal, preferiblemente antes de dormir',
    almacenamiento: 'Conservar en lugar fresco; algunos requieren refrigeración',
  },
  supositorios: {
    uso: 'Aplicación vía rectal según indicación',
    almacenamiento: 'Conservar en lugar fresco; algunos requieren refrigeración',
  },
  polvo: {
    uso: 'Diluir o reconstituir según las instrucciones del empaque',
    almacenamiento: 'Conservar en lugar fresco y seco, bien cerrado',
  },
  parche: {
    uso: 'Aplicar sobre piel limpia y seca, según el tiempo indicado',
    almacenamiento: 'Conservar en su envoltorio original hasta el momento de uso',
  },
  spray: {
    uso: 'Aplicar el número de disparos indicado, según la vía correspondiente',
    almacenamiento: 'Conservar en lugar fresco, evitar exposición directa al sol',
  },
  aerosol: {
    uso: 'Aplicar el número de disparos indicado, según la vía correspondiente',
    almacenamiento: 'Conservar en lugar fresco, evitar exposición directa al sol',
  },
}

const TIP_POR_DEFECTO = {
  uso: 'Utilizar siguiendo las indicaciones del empaque o de tu profesional de salud',
  almacenamiento: 'Conservar en lugar fresco y seco, fuera del alcance de los niños',
}

export function obtenerTipForma(forma) {
  if (!forma) return TIP_POR_DEFECTO
  const clave = forma.trim().toLowerCase()
  return FORMAS_FARMACEUTICAS[clave] || TIP_POR_DEFECTO
}

export default FORMAS_FARMACEUTICAS