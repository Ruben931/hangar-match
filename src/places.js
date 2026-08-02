/**
 * Tous les hubs / villes SC où un joueur peut se trouver
 * (landing zones + stations majeures), pour l'autocomplete
 * et le tri par proximité.
 *
 * `typeAs` = ce que le joueur peut taper
 * `match`  = regex pour reconnaître les lieux dans les fiches vaisseau
 */

export const PLACES = [
  // —— Stanton : landing zones ——
  {
    id: "lorville",
    label: "Lorville",
    subtitle: "Hurston · Stanton",
    system: "stanton",
    body: "hurston",
    typeAs: ["lorville", "hurston", "teasa", "teasa spaceport", "vantage"],
    match: [/lorville/i, /teasa/i, /vantage rentals/i, /new deal/i],
  },
  {
    id: "area18",
    label: "Area18",
    subtitle: "ArcCorp · Stanton",
    system: "stanton",
    body: "arccorp",
    typeAs: ["area18", "area 18", "arccorp", "arc corp"],
    match: [/area\s*18/i, /astro armada/i, /traveler rentals/i],
  },
  {
    id: "orison",
    label: "Orison",
    subtitle: "Crusader · Stanton",
    system: "stanton",
    body: "crusader",
    typeAs: ["orison", "crusader"],
    match: [/orison/i, /crusader showroom/i],
  },
  {
    id: "newbabbage",
    label: "New Babbage",
    subtitle: "microTech · Stanton",
    system: "stanton",
    body: "microtech",
    typeAs: ["new babbage", "newbabbage", "babbage", "microtech", "micro tech"],
    match: [/new babbage/i, /regal luxury/i],
  },
  {
    id: "grimhex",
    label: "Grim HEX",
    subtitle: "Yela · Crusader · Stanton",
    system: "stanton",
    body: "crusader",
    typeAs: ["grim hex", "grimhex", "grim", "yela"],
    match: [/grim\s*hex/i],
  },

  // —— Stanton : stations orbitales majeures ——
  {
    id: "everus",
    label: "Everus Harbor",
    subtitle: "Hurston orbit · Stanton",
    system: "stanton",
    body: "hurston",
    typeAs: ["everus harbor", "everus", "harbor"],
    match: [/everus/i],
  },
  {
    id: "baijini",
    label: "Baijini Point",
    subtitle: "ArcCorp orbit · Stanton",
    system: "stanton",
    body: "arccorp",
    typeAs: ["baijini point", "baijini"],
    match: [/baijini/i],
  },
  {
    id: "seraphim",
    label: "Seraphim Station",
    subtitle: "Crusader orbit · Stanton",
    system: "stanton",
    body: "crusader",
    typeAs: ["seraphim station", "seraphim"],
    match: [/seraphim/i],
  },
  {
    id: "tressler",
    label: "Port Tressler",
    subtitle: "microTech orbit · Stanton",
    system: "stanton",
    body: "microtech",
    typeAs: ["port tressler", "tressler"],
    match: [/tressler/i],
  },

  // —— Pyro : hubs ——
  {
    id: "checkmate",
    label: "Checkmate",
    subtitle: "Monox · Pyro",
    system: "pyro",
    body: "monox",
    typeAs: ["checkmate", "checkmate station", "monox", "pyro"],
    match: [/checkmate/i, /buy\s*&\s*fly/i, /\bpyro\b/i],
  },
  {
    id: "orbituary",
    label: "Orbituary",
    subtitle: "Bloom · Pyro",
    system: "pyro",
    body: "bloom",
    typeAs: ["orbituary", "bloom", "pyro"],
    match: [/orbituary/i, /buy\s*&\s*fly/i, /\bpyro\b/i],
  },
  {
    id: "ruin",
    label: "Ruin Station",
    subtitle: "Terminus · Pyro",
    system: "pyro",
    body: "terminus",
    typeAs: ["ruin station", "ruin", "terminus", "pyro"],
    match: [/ruin/i, /buy\s*&\s*fly/i, /\bpyro\b/i],
  },

  // —— Nyx ——
  {
    id: "levski",
    label: "Levski",
    subtitle: "Delamar · Nyx",
    system: "nyx",
    body: "delamar",
    typeAs: ["levski", "delamar", "nyx"],
    match: [/levski/i, /delamar/i, /teach'?s/i],
  },

  // —— Loueurs génériques (refinery / partners) ——
  {
    id: "stations",
    label: "Stations / Refinery",
    subtitle: "Rental partners · Stanton+",
    system: "stanton",
    body: "orbit",
    typeAs: [
      "stations",
      "station",
      "refinery",
      "refinery deck",
      "rental partners",
      "stations orbitales",
      "orbitale",
      "orbitales",
    ],
    match: [/refinery deck/i, /stations?\s*\/\s*rental/i, /rental partners/i],
  },
];

export function normalizePlaceQuery(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** tous les textes sur lesquels on peut taper, lettre par lettre */
function placeSearchKeys(place) {
  const keys = new Set();
  const add = (raw) => {
    const n = normalizePlaceQuery(raw);
    if (!n) return;
    keys.add(n);
    for (const word of n.split(" ")) {
      if (word) keys.add(word);
    }
  };
  add(place.label);
  for (const a of place.typeAs || []) add(a);
  return [...keys];
}

/**
 * Suggestions à chaque lettre tapée.
 * Champ vide → toute la liste des villes / hubs.
 */
export function suggestPlaces(query, limit = 20) {
  const q = normalizePlaceQuery(query);
  if (!q) return PLACES.slice(0, limit);

  const scored = PLACES.map((p) => {
    const label = normalizePlaceQuery(p.label);
    const keys = placeSearchKeys(p);
    let rank = 99;
    if (label === q) rank = 0;
    else if (label.startsWith(q)) rank = 1;
    else if (keys.some((k) => k === q)) rank = 2;
    else if (keys.some((k) => k.startsWith(q))) rank = 3;
    return { place: p, rank };
  }).filter((x) => x.rank < 99);

  scored.sort(
    (a, b) => a.rank - b.rank || a.place.label.localeCompare(b.place.label)
  );
  return scored.slice(0, limit).map((x) => x.place);
}

export function findPlaceById(id) {
  return PLACES.find((p) => p.id === id) || null;
}

/** tente de résoudre un texte libre vers un lieu */
export function resolvePlace(text) {
  const q = normalizePlaceQuery(text);
  if (!q) return null;
  const exact = PLACES.find((p) => {
    const keys = placeSearchKeys(p);
    return keys.some((k) => k === q);
  });
  if (exact) return exact;
  const starts = suggestPlaces(q, 1);
  return starts[0] || null;
}

function placeOfLocation(loc) {
  return PLACES.find((p) => p.match.some((re) => re.test(loc))) || null;
}

/**
 * Distance 0 = sur place, 1 = même planète/corps, 2 = même système, 4 = loin, 9 = inconnu
 */
export function distanceLocToPlace(loc, place) {
  if (!place || !loc) return 9;
  if (place.match.some((re) => re.test(loc))) return 0;
  const from = placeOfLocation(loc);
  if (from) {
    if (from.id === place.id) return 0;
    if (from.body === place.body) return 1;
    if (from.system === place.system) return 2;
    return 4;
  }
  return 9;
}

/** meilleure (plus petite) distance d'un vaisseau vers le lieu choisi */
export function shipDistanceToPlace(ship, place, buyLocs, rentLocs) {
  if (!place) return 9;
  const locs = [...(buyLocs || []), ...(rentLocs || [])];
  if (!locs.length) return 9;
  let best = 9;
  for (const loc of locs) {
    const d = distanceLocToPlace(loc, place);
    if (d < best) best = d;
  }
  return best;
}
