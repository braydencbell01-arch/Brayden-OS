import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Canonical live URL: https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/
export default defineConfig({
  base: '/Brayden-OS/jerseydeals/',
  plugins: [react(), tailwindcss()],
})
