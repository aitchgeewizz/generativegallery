import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,
  },
  // Dev logging stays; production ships silent (and emoji-free).
  esbuild: command === 'build' ? { drop: ['console' as const, 'debugger' as const] } : {},
}))
