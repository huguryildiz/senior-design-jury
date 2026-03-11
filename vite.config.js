import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vercel deploy runs at the domain root. Using a subpath base causes /assets/* 404s.
  base: '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          xlsx: ['xlsx-js-style'],
        },
      },
    },
  },
})
