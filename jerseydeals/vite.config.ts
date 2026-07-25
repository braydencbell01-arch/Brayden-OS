import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default `./` for monorepo Pages path (/Brayden-OS/jerseydeals/).
// Dedicated domain deploy sets JERSEYDEALS_BASE=/
const base = process.env.JERSEYDEALS_BASE || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
