import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default `./` for monorepo Pages path (/Brayden-OS/platequest/).
const base = process.env.PLATEQUEST_BASE || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
