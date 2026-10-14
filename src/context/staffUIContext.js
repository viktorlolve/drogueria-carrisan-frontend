import { createContext } from 'react'

// Contexto de los avisos y confirmaciones propias del staff. Vive aparte del
// provider (StaffUIProvider.jsx) y del hook (hooks/useStaffUI.js) porque
// react-refresh no permite mezclar componentes con otros exports.
export const StaffUIContext = createContext(null)
