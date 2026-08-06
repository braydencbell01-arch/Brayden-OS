import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default `./` for GitHub Pages path (/Brayden-OS/platequest/).
// Cloudflare dedicated host sets PLATEQUEST_BASE=/
const base = process.env.PLATEQUEST_BASE || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
