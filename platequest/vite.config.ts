import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dedicated Pages site: https://braydenbell.github.io/PlateQuest/
// CI sets PLATEQUEST_BASE=/PlateQuest/. Local preview can use ./
const base = process.env.PLATEQUEST_BASE || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
