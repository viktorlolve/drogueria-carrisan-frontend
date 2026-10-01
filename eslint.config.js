import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
rules: {
        'react-refresh/only-export-components': [
          'error',
          {
            // Helpers de formato compartidos por las colas de Logística: viven
            // junto a los componentes que los usan (components/staff/ColaOrdenes.jsx)
            // y los importan las 6 páginas de cola. Mismo caso que los hooks de
            // contexto de arriba: son exports sin estado, no estado de componente.
            allowExportNames: [
              'useColorMode',
              'useColorModeValue',
              'toaster',
              'useLoadingBar',
              'useCart',
              'useAuth',
              'useEnvio',
              'useFavoritos',
              'useStaffAuth',
              'useStaffBadges',
              'formatUSD',
              'formatFecha',
              'etiquetaEnvio',
              'direccion',
            ],
          },
        ],
      },
  },
])
