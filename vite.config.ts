import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` must match the GitHub Pages repository path so built asset URLs
// resolve correctly at https://cnklc.github.io/Webex-export/
export default defineConfig({
  base: '/Webex-export/',
  plugins: [react()],
})
