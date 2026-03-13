import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production'
      ? {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        }
      : undefined,
    // Aumentar límite de tamaño de chunk para evitar warnings
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Estrategia simple de splitting sin manualChunks
        // que es más compatible con rolldown
      }
    }
  }
}))


