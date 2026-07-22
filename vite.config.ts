import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project URL: https://braydencbell01-arch.github.io/Brayden-OS/
export default defineConfig({
  base: '/Brayden-OS/',
  plugins: [react(), tailwindcss()],
})
