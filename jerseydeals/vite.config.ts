import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the shop works on both:
//   https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/
//   https://jerseydeals.online/jerseydeals/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
