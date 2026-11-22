import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Límite de precache ampliado: el default de Workbox es 2 MiB
        // y abortaba el build si algún chunk lo superaba
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
      manifest: {
        name: 'Sistema de Precintos',
        short_name: 'Precintos',
        description: 'Gestión de inventario y viajes de precintos',
        theme_color: '#0B5FA5', // El azul de tu barra superior
        background_color: '#f3f4f6', // El gris de fondo
        display: 'standalone', // Modo App (sin barra del navegador)
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})