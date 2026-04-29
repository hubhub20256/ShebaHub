import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'



// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        license({
          banner: `/*! This software includes third-party open-source code. For license details, see /licenses.txt */`,
          thirdParty: {
            output: {
              file: "dist/licenses.txt",
            },
          },
        }),
      ],
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
