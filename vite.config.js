import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages serves this project from /SupportQ/.
  // Vercel serves it from the domain root.
  base: process.env.GITHUB_ACTIONS ? '/SupportQ/' : '/',
}))
