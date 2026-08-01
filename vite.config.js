import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        legal: resolve(__dirname, "mentions-legales.html"),
        privacy: resolve(__dirname, "confidentialite.html"),
      },
    },
  },
});
