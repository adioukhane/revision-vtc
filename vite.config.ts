import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relative : fonctionne en local, sur GitHub Pages (/revision-vtc/) et sur Vercel
export default defineConfig({
  base: './',
  plugins: [react()],
})
