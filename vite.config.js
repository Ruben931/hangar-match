import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const bestDir = resolve(__dirname, "meilleurs-vaisseaux");
const bestPages = Object.fromEntries(
  readdirSync(bestDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [`best-${f.replace(/\.html$/, "")}`, resolve(bestDir, f)])
);

const toolsDir = resolve(__dirname, "outils");
const toolsPages = Object.fromEntries(
  readdirSync(toolsDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [`tools-${f.replace(/\.html$/, "")}`, resolve(toolsDir, f)])
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        legal: resolve(__dirname, "mentions-legales.html"),
        privacy: resolve(__dirname, "confidentialite.html"),
        bestHub: resolve(__dirname, "meilleurs-vaisseaux.html"),
        toolsHub: resolve(__dirname, "outils.html"),
        ...bestPages,
        ...toolsPages,
      },
    },
  },
});
