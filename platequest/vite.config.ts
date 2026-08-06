import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cloudflare Pages site root: https://platequest.pages.dev/
// Override with PLATEQUEST_BASE for alternate hosts.
const base = process.env.PLATEQUEST_BASE || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
