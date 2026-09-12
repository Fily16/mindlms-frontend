import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Puerto fijo: el backend solo permite CORS desde localhost:5173.
    // strictPort evita que Vite salte silenciosamente a otro puerto
    // (5174, 5175...) y el login falle con un falso "Credenciales incorrectas".
    port: 5173,
    strictPort: true,
  },
})
