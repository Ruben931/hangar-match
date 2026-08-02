/**
 * Rebuild ships.json from:
 * 1) Official RSI Ship Matrix (all ships/vehicles)
 * 2) Wiki dealership pages (inventaire + prix aUEC par concession et par système)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public/data/ships.json");
const matrixPath = path.join(root, "ship-matrix.json");

/** Concessionnaires : une page wiki par boutique, avec système associé */
const SHOPS = [
  { page: "Astro Armada", label: "Astro Armada — Area18", system: "stanton" },
  { page: "New Deal", label: "New Deal — Teasa Spaceport, Lorville", system: "stanton" },
  { page: "Crusader Industries Showroom", label: "Crusader Showroom — Orison", system: "stanton" },
  { page: "Teach's Ship Shop", label: "Teach's Ship Shop — Levski (Nyx)", system: "nyx" },
  { page: "Buy & Fly", label: "Buy & Fly — Pyro (Checkmate · Orbituary · Ruin)", system: "pyro" },
];

const RENT_DAY = {
  "Aurora ES": 2482,
  "Aurora LN": 7507,
  "Aurora CL": 8000,
  "Aurora MR": 5000,
  "Mustang Alpha": 5028,
  "Mustang Gamma": 18825,
  "Avenger Titan": 15712,
  "Avenger Warlock": 28295,
  "Arrow": 19446,
  "300i": 23016,
  "Cutlass Black": 25000,
  "Cutlass Red": 30000,
  "Freelancer": 59252,
  "Nomad": 15000,
  "Hull A": 20000,
  "Prospector": 45000,
  "Vulture": 40000,
  "C8 Pisces": 10000,
  "Constellation Andromeda": 70000,
  "Constellation Taurus": 160877,
  "600i Explorer": 142127,
  "M50": 17907,
  "RAFT": 35000,
  "MOLE": 80000,
  "Cutter": 6000,
  "Reliant Kore": 18000,
  "100i": 28665,
  "325a": 46305,
};

const RENT_LOCS = {
  "Aurora ES": ["Traveler Rentals — Area18", "Vantage Rentals — Lorville"],
  "Aurora LN": ["Regal Luxury Rentals — New Babbage"],
  "Avenger Titan": ["Traveler Rentals — Area18"],
  "Arrow": ["Traveler Rentals — Area18"],
  "300i": ["Traveler Rentals — Area18", "Regal Luxury Rentals — New Babbage"],
  "Cutlass Black": ["Traveler Rentals — Area18", "Vantage Rentals — Lorville"],
  "Freelancer": ["Vantage Rentals — Lorville"],
  "Mustang Alpha": ["Traveler Rentals — Area18"],
  "Mustang Gamma": ["Traveler Rentals — Area18", "Regal Luxury Rentals — New Babbage"],
  "Constellation Andromeda": [
    "Traveler Rentals — Area18",
    "Regal Luxury Rentals — New Babbage",
  ],
  "Nomad": ["Traveler Rentals — Area18"],
  "C8 Pisces": ["Traveler Rentals — Area18"],
  "M50": ["Regal Luxury Rentals — New Babbage"],
  "600i Explorer": ["Regal Luxury Rentals — New Babbage"],
  "Prospector": ["Refinery Deck rentals"],
  "Vulture": ["Stations / rental partners"],
  "MOLE": ["Refinery Deck rentals"],
  "RAFT": ["Traveler Rentals — Area18"],
  "Hull A": ["Traveler Rentals — Area18"],
  "Cutlass Red": ["Traveler Rentals — Area18"],
  "Reliant Kore": ["Traveler Rentals — Area18"],
  "Cutter": ["Vantage Rentals — Lorville"],
  "100i": ["Regal Luxury Rentals — New Babbage"],
  "325a": ["Regal Luxury Rentals — New Babbage"],
  "Constellation Taurus": ["Regal Luxury Rentals — New Babbage"],
  "Avenger Warlock": ["Regal Luxury Rentals — New Babbage"],
};

function slug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeKey(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/mk\s*i+\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** aliases: wiki name key -> also match these matrix keys */
function aliasKeys(name) {
  const keys = new Set([normalizeKey(name)]);
  const n = name.replace(/\s+Mk\s*I+\b/gi, "").trim();
  keys.add(normalizeKey(n));
  // Hornet naming
  if (/f7c/i.test(name)) {
    keys.add(normalizeKey(name.replace(/^F7C\s+/i, "Hornet F7C ")));
    keys.add(normalizeKey(name.replace(/Hornet\s+F7C/i, "F7C Hornet")));
  }
  if (/^M50$/i.test(name)) keys.add(normalizeKey("M50 Interceptor"));
  if (/San.?tok/i.test(name)) keys.add(normalizeKey("Santokyai"));
  return [...keys];
}

function parsePrice(raw) {
  return Number(String(raw).replace(/[^\d]/g, "")) || 0;
}

function cleanWikiName(raw) {
  return String(raw)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''/g, "")
    .replace(/\*/g, "")
    .trim();
}

function focusToRoles(focus, type) {
  const f = `${focus || ""} ${type || ""}`.toLowerCase();
  const roles = new Set();
  if (/starter|pathfinder/.test(f)) roles.add("starter");
  if (/multi|general/.test(f)) roles.add("multipurpose");
  if (/freight|cargo|transport|hauler/.test(f)) {
    roles.add("cargo");
    roles.add("trading");
  }
  if (/fighter|combat|gunship|bomber|interceptor|stealth|military/.test(f))
    roles.add("combat");
  if (/bounty|interdiction|tracker/.test(f)) roles.add("bounty");
  if (/mining|prospector/.test(f)) roles.add("mining");
  if (/salvage/.test(f)) roles.add("salvage");
  if (/explor|expedition|science/.test(f)) roles.add("exploration");
  if (/medical|rescue|support/.test(f)) roles.add("medical");
  if (/rac|competition/.test(f)) roles.add("racing");
  if (/tour|tour|touring|tour/.test(f) || /tour/.test(f)) roles.add("luxury");
  if (/tour|touring/.test(f)) roles.add("luxury");
  if (/tour/.test(focus?.toLowerCase() || "")) roles.add("luxury");
  if (/touring|tour/.test(f)) roles.add("luxury");
  if (/tour|touring|tour/.test(f)) {
    /* noop keep */
  }
  if (/touring/.test(f) || focus?.toLowerCase().includes("tour")) roles.add("luxury");
  if (/tour/.test(f)) roles.add("luxury");
  // touring
  if (/touring|tour/.test(f)) roles.add("luxury");
  if (/touring/.test(f)) roles.add("luxury");
  if ((focus || "").toLowerCase().includes("tour")) roles.add("luxury");
  if ((focus || "").toLowerCase().includes("touring")) roles.add("luxury");
  if (!roles.size) {
    if (type === "combat") roles.add("combat");
    else if (type === "exploration") roles.add("exploration");
    else if (type === "transport") {
      roles.add("cargo");
      roles.add("trading");
    } else if (type === "industrial") roles.add("mining");
    else if (type === "competition") roles.add("racing");
    else if (type === "support") roles.add("medical");
    else if (String(type || "").toLowerCase() === "ground")
      roles.add("multipurpose");
    else roles.add("multipurpose");
  }
  // clean luxury detection properly
  const fl = (focus || "").toLowerCase();
  if (fl.includes("tour") || fl.includes("luxury")) roles.add("luxury");
  return [...roles];
}

/** rovers / bikes / tanks (RSI type parfois "Ground", parfois mal tagué) */
const GROUND_NAME_RE =
  /^(ATLS(?:\s+GEO)?|MTC|PTV|STV|ROC(?:-DS)?|Cyclone(?:-\w+)?|Ursa(?:\s+\w+)?|Lynx|G12[ar]?|Nova|Ballista(?:\s+\w+)?|Anvil Ballista(?:\s+\w+)?|Centurion|Spartan|Storm(?:\s+AA)?|Ranger\s+\w+|Pulse(?:\s+LX)?|X1(?:\s+\w+)?|Nox(?:\s+\w+)?|Dragonfly(?:\s+\w+)?|HoverQuad|Mule|MDC)\b/i;

function isGroundVehicle(name, size, type) {
  const t = String(type || "").toLowerCase();
  const s = String(size || "").toLowerCase();
  if (t === "ground" || s === "ground" || s === "vehicle") return true;
  return GROUND_NAME_RE.test(name || "");
}

function mapSize(size, type, name) {
  if (isGroundVehicle(name, size, type)) return "ground";
  const s = (size || "").toLowerCase();
  if (["snub", "small", "medium", "large", "capital"].includes(s)) {
    return s === "snub" ? "small" : s;
  }
  return "small";
}

async function ensureMatrix() {
  if (fs.existsSync(matrixPath)) {
    const age = Date.now() - fs.statSync(matrixPath).mtimeMs;
    if (age < 1000 * 60 * 60 * 24) {
      return JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    }
  }
  console.log("Downloading RSI ship matrix…");
  const res = await fetch("https://robertsspaceindustries.com/ship-matrix/index");
  const json = await res.json();
  fs.writeFileSync(matrixPath, JSON.stringify(json));
  return json;
}

async function fetchWikitext(page) {
  const url = `https://starcitizen.tools/api.php?action=parse&page=${encodeURIComponent(
    page
  )}&prop=wikitext&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.parse?.wikitext?.["*"] || "";
}

/** Parse toutes les lignes {ship, prix} des tables d'une page concession */
function parseShopRows(wikitext) {
  const out = [];
  for (const chunk of wikitext.split(/\n\|-+/)) {
    const cells = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|") && !l.startsWith("|}") && !l.startsWith("|-"))
      .map((l) => l.replace(/^\|/, "").trim())
      // retire les attributs de cellule type rowspan="3" |
      .map((l) => l.replace(/^(?:[a-z]+="[^"]*"\s*)+\|\s*/i, ""));
    if (cells.length < 2) continue;

    // dernière cellule purement numérique = prix
    let priceIdx = -1;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (/^[\d.,\s]+$/.test(cells[i]) && parsePrice(cells[i]) > 0) {
        priceIdx = i;
        break;
      }
    }
    if (priceIdx < 1) continue;

    const name = cleanWikiName(cells[priceIdx - 1]);
    const price = parsePrice(cells[priceIdx]);
    if (!name || !price) continue;
    out.push({ name, price });
  }
  return out;
}

async function fetchWikiPurchases() {
  const canonical = new Map(); // normKey -> { name, offers[] }

  for (const shop of SHOPS) {
    const wikitext = await fetchWikitext(shop.page);
    if (!wikitext) {
      console.warn(`⚠ page wiki introuvable : ${shop.page}`);
      continue;
    }
    const rows = parseShopRows(wikitext);
    console.log(`${shop.page}: ${rows.length} entrées`);
    for (const { name, price } of rows) {
      // "Golem Teach's Special" -> "Golem" (variante boutique)
      const baseName = name.replace(/\s*Teach'?s Special\s*$/i, "").trim();
      if (!baseName) continue;
      const key = normalizeKey(baseName);
      if (!canonical.has(key)) canonical.set(key, { name: baseName, offers: [] });
      const entry = canonical.get(key);
      const existing = entry.offers.find((o) => o.location === shop.label);
      if (existing) existing.price = Math.min(existing.price, price);
      else entry.offers.push({ location: shop.label, system: shop.system, price });
    }
  }

  const byKey = new Map();
  for (const entry of canonical.values()) {
    entry.offers.sort((a, b) => a.price - b.price);
    const rec = {
      name: entry.name,
      priceAuec: entry.offers[0].price,
      buyLocations: entry.offers.map((o) => o.location),
      buyOffers: entry.offers,
    };
    for (const k of aliasKeys(entry.name)) {
      if (!byKey.has(k)) byKey.set(k, rec);
    }
  }
  return byKey;
}

function findPurchase(byKey, matrixName) {
  for (const k of aliasKeys(matrixName)) {
    if (byKey.has(k)) return byKey.get(k);
  }
  // fuzzy: matrix "Aurora Mk I ES" -> try without mk
  const stripped = matrixName.replace(/\s+Mk\s*I+\b/gi, "").trim();
  for (const k of aliasKeys(stripped)) {
    if (byKey.has(k)) return byKey.get(k);
  }
  return null;
}

function displayName(matrixName, purchase) {
  // Prefer shorter wiki name when it's the same ship
  if (!purchase) return matrixName;
  const a = normalizeKey(matrixName);
  const b = normalizeKey(purchase.name);
  if (a === b || a.includes(b) || b.includes(a)) return purchase.name;
  return matrixName;
}

function imageFromMatrix(ship) {
  const images = ship.media?.[0]?.images;
  return (
    images?.channel_item_full ||
    images?.slideshow_wide ||
    images?.slideshow ||
    images?.post ||
    ship.media?.[0]?.source_url ||
    null
  );
}

const matrixJson = await ensureMatrix();
const purchases = await fetchWikiPurchases();
const matrix = matrixJson.data || [];

const ships = matrix.map((s) => {
  const purchase = findPurchase(purchases, s.name);
  const name = displayName(s.name, purchase);
  const roles = focusToRoles(s.focus, s.type);
  const ground = isGroundVehicle(name, s.size, s.type);
  const size = mapSize(s.size, s.type, name);
  const min = s.min_crew || 1;
  const max = s.max_crew || min;
  const crew = min === max ? String(min) : `${min}–${max}`;
  const priceAuec = purchase?.priceAuec ?? null;
  const buyLocations = purchase?.buyLocations ?? [];
  const buyOffers = purchase?.buyOffers ?? [];

  return {
    id: slug(s.name),
    name,
    matrixName: s.name,
    manufacturer: s.manufacturer?.name || "Unknown",
    size,
    vehicleType: ground ? "ground" : s.type || "multi",
    productionStatus: s.production_status || "unknown",
    focus: s.focus || "",
    crew,
    roles,
    priceAuec,
    rentDay: RENT_DAY[name] ?? RENT_DAY[s.name] ?? null,
    buyLocations,
    buyOffers,
    rentLocations: RENT_LOCS[name] || RENT_LOCS[s.name] || [],
    cargoScu: s.cargocapacity ?? 0,
    description:
      (s.description || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280) || `${name} — ${s.focus || s.type}.`,
    image: imageFromMatrix(s),
    pledgeUrl: s.url
      ? `https://robertsspaceindustries.com${s.url}`
      : null,
    inGameBuy: Boolean(priceAuec && buyLocations.length),
    sourceUpdated: "2026-08-01",
    patch: "Ship Matrix + pages concessions wiki (Alpha 4.8)",
  };
});

// Prefer flight-ready first in file order by price then name
ships.sort((a, b) => {
  const ap = a.priceAuec ?? 1e15;
  const bp = b.priceAuec ?? 1e15;
  if (ap !== bp) return ap - bp;
  return a.name.localeCompare(b.name);
});

fs.writeFileSync(outPath, JSON.stringify(ships, null, 2));

const withBuy = ships.filter((s) => s.inGameBuy).length;
const flight = ships.filter((s) => s.productionStatus === "flight-ready").length;
console.log(`Wrote ${ships.length} ships (${flight} flight-ready, ${withBuy} with aUEC buy)`);
console.log(
  "No image:",
  ships.filter((s) => !s.image).length
);
