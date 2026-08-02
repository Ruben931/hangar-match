/**
 * Snapshot UEX commodities → public/data/commodities.json
 * Source: https://api.uexcorp.uk/2.0/commodities (community prices)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "public/data/commodities.json");

const API = "https://api.uexcorp.uk/2.0/commodities";

const res = await fetch(API, {
  headers: { Accept: "application/json", "User-Agent": "HangarMatch/1.0" },
});
if (!res.ok) {
  console.error(`UEX fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const payload = await res.json();
if (payload.status !== "ok" || !Array.isArray(payload.data)) {
  console.error("Unexpected UEX response", payload?.message || payload?.status);
  process.exit(1);
}

const commodities = payload.data
  .filter((c) => c.is_visible && c.is_available_live)
  .filter((c) => c.is_buyable || c.is_sellable)
  .map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    slug: c.slug || String(c.name || "").toLowerCase().replace(/\s+/g, "-"),
    kind: c.kind || "",
    priceBuy: typeof c.price_buy === "number" ? c.price_buy : null,
    priceSell: typeof c.price_sell === "number" ? c.price_sell : null,
    isIllegal: Boolean(c.is_illegal),
    isMineral: Boolean(c.is_mineral),
    isBuyable: Boolean(c.is_buyable),
    isSellable: Boolean(c.is_sellable),
    wiki: c.wiki || null,
  }))
  .filter(
    (c) =>
      (typeof c.priceBuy === "number" && c.priceBuy > 0) ||
      (typeof c.priceSell === "number" && c.priceSell > 0)
  )
  .sort((a, b) => a.name.localeCompare(b.name));

const out = {
  source: "UEX Corp API 2.0",
  url: API,
  fetchedAt: new Date().toISOString(),
  count: commodities.length,
  note: "Crowdsourced averages — not live server data. Fan tool, not affiliated with CIG or UEX.",
  commodities,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${commodities.length} commodities → ${outPath}`);
