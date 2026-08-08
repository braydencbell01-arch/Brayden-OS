import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Default `./` for GitHub Pages path (/Brayden-OS/philroyale/).
const base = process.env.PHILROYALE_BASE || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
