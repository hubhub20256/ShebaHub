import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import license from "rollup-plugin-license";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        license({
          banner: `/*! This software includes third-party open-source code. For license details, see /LICENSES.TXT */`,
          thirdParty: {
            output: {
              file: "dist/LICENSES.TXT",
            },
          },
        }),
      ],
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console"] : [],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
