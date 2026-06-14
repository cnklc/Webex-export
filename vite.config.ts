import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Served from a custom domain (webex.cnklc.me) at the site root, so `base` is '/'.
// If you ever drop the custom domain and serve from the project path instead,
// change this to '/Webex-export/'.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
