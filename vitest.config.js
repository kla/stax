import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
  },
})
