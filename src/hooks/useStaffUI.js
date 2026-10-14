import { useContext } from 'react'
import { StaffUIContext } from '../context/staffUIContext'

// Reemplazo de window.confirm / window.alert para las páginas de staff.
//
//   const { confirmar, avisar } = useStaffUI()
//
//   // Confirmación (devuelve Promise<boolean>):
//   if (!(await confirmar({ titulo: '¿Cancelar la orden #12?', texto: '…', textoConfirmar: 'Cancelar orden', peligro: true }))) return
//
//   // Aviso (toast): 'exito' (por defecto) | 'error' | 'info'
//   avisar('Recordatorio enviado')
//   avisar(err.response?.data?.error || 'No se pudo guardar', 'error')
export function useStaffUI() {
  const ctx = useContext(StaffUIContext)
  if (!ctx) throw new Error('useStaffUI debe usarse dentro de <StaffUIProvider>')
  return ctx
}
