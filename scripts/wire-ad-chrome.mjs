/**
 * Injecte teaser + rails + footer pub dans les pages secondaires
 * (mêmes data-slot AdSense que l’accueil).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TEASER_HTML,
  AD_RAILS_HTML,
  AD_FOOTER_HTML,
} from "./page-chrome.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const FILES = [
  "outils.html",
  "outils/hangar.html",
  "outils/trade.html",
  "outils/comparer.html",
  "app.html",
  "meilleurs-vaisseaux.html",
];

function ensureChrome(html) {
  let out = html;

  // teaser sticky en tête de body
  if (!out.includes("app-teaser--sticky")) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>\n${TEASER_HTML}\n`);
  } else if (!out.includes('id="app-teaser"') && out.includes("app-teaser--sticky")) {
    // app.html a parfois id="app-teaser-top" — ok
  }

  // rails latéraux
  if (!out.includes('data-slot="sky-left"')) {
    // après teaser ou juste après <body>…teaser
    if (out.includes("app-teaser--sticky")) {
      out = out.replace(
        /(<\/a>\s*\n)(\s*<header)/i,
        `$1${AD_RAILS_HTML}\n$2`
      );
      // fallback si teaser fermé autrement
      if (!out.includes('data-slot="sky-left"')) {
        out = out.replace(
          /(<a class="app-teaser[\s\S]*?<\/a>)/i,
          `$1\n${AD_RAILS_HTML}`
        );
      }
    } else {
      out = out.replace(/<body([^>]*)>/i, `<body$1>\n${AD_RAILS_HTML}\n`);
    }
  }

  // footer pub avant site-footer
  if (!out.includes('data-slot="footer"')) {
    out = out.replace(
      /(\s*)(<footer class="site-footer)/i,
      `$1${AD_FOOTER_HTML}\n$1$2`
    );
  }

  // leaderboard placeholder unifié
  out = out.replace(
    /(<div class="promo-frame promo-frame--leader" data-slot="leaderboard">\s*<span class="promo-placeholder">)[^<]*/i,
    `$1728 × 90 — bandeau`
  );

  return out;
}

for (const rel of FILES) {
  const file = path.join(root, rel);
  const before = fs.readFileSync(file, "utf8");
  const after = ensureChrome(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    console.log("wired", rel);
  } else {
    console.log("ok   ", rel);
  }
}
