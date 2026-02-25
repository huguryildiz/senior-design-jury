import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/senior-design-jury/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          xlsx: ['xlsx'],
          papaparse: ['papaparse'],
        },
      },
    },
  },
})
