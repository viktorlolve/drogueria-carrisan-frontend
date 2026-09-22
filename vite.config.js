import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Droguería Carrisan, C.A.',
        short_name: 'Drogueria Carrisan',
        description: 'Plataforma B2B farmacéutica para empresas y médicos',
        theme_color: '#0052DC',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000, // 1 MB — alerta si una página ruta crece demasiado
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        staff: fileURLToPath(new URL('./staff.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react-router') || id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react'
          if (id.includes('@chakra-ui') || id.includes('@emotion') || id.includes('framer-motion')) return 'vendor-chakra'
          if (id.includes('leaflet')) return 'vendor-leaflet'
          if (id.includes('recharts') || id.includes('victory-vendor')) return 'vendor-charts'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('xlsx')) return 'vendor-xlsx'
        },
      },
    },
  },
})