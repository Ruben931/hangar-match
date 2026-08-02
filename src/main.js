import {
  LANG_CHOICES,
  initLang,
  getLang,
  setLang,
  localeOf,
  t,
} from "./i18n.js";
import { detectAdBlock, mountGate, hideGate } from "./adgate.js";
import { mountAds } from "./ads.js";
import {
  suggestPlaces,
  resolvePlace,
  findPlaceById,
  shipDistanceToPlace,
  distanceLocToPlace,
} from "./places.js";

function sizeLabel(size) {
  const map = {
    small: "sizeSmall",
    snub: "sizeSmall",
    medium: "sizeMedium",
    large: "sizeLarge",
    capital: "sizeCapital",
    ground: "sizeGround",
  };
  return map[size] ? t(map[size]) : size || "—";
}

const ROLE_IDS = [
  "starter",
  "multipurpose",
  "cargo",
  "trading",
  "combat",
  "bounty",
  "mining",
  "salvage",
  "exploration",
  "medical",
  "racing",
  "luxury",
];

const form = document.querySelector("#finder-form");
const budgetInput = document.querySelector("#budget");
const budgetRange = document.querySelector("#budget-range");
const queryInput = document.querySelector("#query");
const queryClear = document.querySelector("#query-clear");
const placeInput = document.querySelector("#place");
const placeClear = document.querySelector("#place-clear");
const placeSuggest = document.querySelector("#place-suggest");
const roleGrid = document.querySelector("#role-grid");
const systemSelect = document.querySelector("#starsystem");
const sizeSelect = document.querySelector("#size");
const domainSelect = document.querySelector("#domain");
const catalogSelect = document.querySelector("#catalog");
const acquireSelect = document.querySelector("#acquire");
const sortSelect = document.querySelector("#sort");
const langSelect = document.querySelector("#lang");
const resultsEl = document.querySelector("#results");
const resultsCount = document.querySelector("#results-count");

let ships = [];
let hasSearched = false;
/** @type {import('./places.js').PLACES[number] | null} */
let selectedPlace = null;
let placeActiveIndex = -1;

function formatAuec(n) {
  return new Intl.NumberFormat(localeOf()).format(n) + " aUEC";
}

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesQuery(ship, q) {
  if (!q) return true;
  const hay = normalizeText(
    [ship.name, ship.matrixName, ship.manufacturer, ship.focus]
      .filter(Boolean)
      .join(" ")
  );
  const terms = normalizeText(q).split(/\s+/).filter(Boolean);
  return terms.every((term) => hay.includes(term));
}

function syncQueryClear() {
  if (queryClear) queryClear.hidden = !queryInput.value;
}

function syncPlaceClear() {
  if (placeClear) placeClear.hidden = !placeInput.value;
}

function hidePlaceSuggest() {
  if (!placeSuggest) return;
  placeSuggest.hidden = true;
  placeSuggest.innerHTML = "";
  placeActiveIndex = -1;
  placeInput?.setAttribute("aria-expanded", "false");
}

function renderPlaceSuggest(list) {
  if (!placeSuggest) return;
  if (!list.length) {
    hidePlaceSuggest();
    return;
  }
  placeSuggest.innerHTML = list
    .map(
      (p, i) => `
      <li role="option" data-id="${p.id}" class="${i === placeActiveIndex ? "active" : ""}" id="place-opt-${i}">
        <b>${placeLabelOf(p)}</b>
        <span>${placeSubtitleOf(p)}</span>
      </li>`
    )
    .join("");
  placeSuggest.hidden = false;
  placeInput.setAttribute("aria-expanded", "true");
}

function placeLabelOf(place) {
  if (!place) return "";
  if (place.id === "stations") return t("placeStations");
  return place.label;
}

function placeSubtitleOf(place) {
  if (!place) return "";
  if (place.id === "stations") return t("placeStationsSub");
  return place.subtitle;
}

function pickPlace(place) {
  selectedPlace = place;
  placeInput.value = place ? placeLabelOf(place) : "";
  syncPlaceClear();
  hidePlaceSuggest();
  if (place && systemSelect) {
    systemSelect.value = place.system;
  }
  if (hasSearched) render();
}

function distanceLabel(d) {
  if (d === 0) return t("nearHere");
  if (d === 1) return t("samePlanet");
  if (d === 2) return t("sameSystem");
  return t("farAway");
}

function syncBudget(fromRange) {
  if (fromRange) {
    budgetInput.value = budgetRange.value;
  } else {
    const v = Math.max(0, Number(budgetInput.value) || 0);
    budgetInput.value = v;
    budgetRange.value = Math.min(
      Number(budgetRange.max),
      Math.max(Number(budgetRange.min), v)
    );
  }
}

function selectedRoles() {
  return [...roleGrid.querySelectorAll("input:checked")].map((el) => el.value);
}

function matchScore(ship, roles) {
  if (!roles.length) return 1;
  const hits = roles.filter((r) => ship.roles.includes(r)).length;
  return hits / roles.length;
}

function canBuy(ship) {
  return typeof ship.priceAuec === "number" && ship.priceAuec > 0;
}

function canRent(ship) {
  return typeof ship.rentDay === "number" && ship.rentDay > 0;
}

const SYSTEM_LABELS = { stanton: "Stanton", pyro: "Pyro", nyx: "Nyx" };

function locationSystem(loc) {
  if (/pyro|ruin station/i.test(loc)) return "pyro";
  if (/levski|delamar|nyx/i.test(loc)) return "nyx";
  return "stanton";
}

/** offres d'achat (boutique + prix) dans le système choisi, triées par prix */
function buyOffersIn(ship, system) {
  const offers = ship.buyOffers || [];
  if (system === "all") return offers;
  return offers.filter((o) => o.system === system);
}

/** meilleur prix aUEC dans le système choisi */
function bestBuyPrice(ship, system) {
  const offers = buyOffersIn(ship, system);
  if (offers.length) return offers[0].price;
  return system === "all" ? ship.priceAuec : null;
}

function buyLocationsIn(ship, system) {
  return buyOffersIn(ship, system).map((o) => o.location);
}

function rentLocationsIn(ship, system) {
  const locs = ship.rentLocations || [];
  if (system === "all") return locs;
  return locs.filter((l) => locationSystem(l) === system);
}

/** lieux utilisés pour le tri proximité selon achat / location */
function locsForPlaceDistance(ship, system, acquire, mode) {
  const buyLocs = buyLocationsIn(ship, system);
  const rentLocs = rentLocationsIn(ship, system);
  if (acquire === "buy" || mode === "buy") return buyLocs;
  if (acquire === "rent" || mode === "rent") return rentLocs;
  return [...buyLocs, ...rentLocs];
}

/** offre d'achat la plus proche du lieu (puis la moins chère) */
function nearestBuyOffer(ship, system, place) {
  const offers = buyOffersIn(ship, system);
  if (!offers.length) return null;
  if (!place) return offers[0];
  let best = null;
  let bestD = 99;
  let bestPrice = Number.POSITIVE_INFINITY;
  for (const o of offers) {
    const d = distanceLocToPlace(o.location, place);
    if (d < bestD || (d === bestD && o.price < bestPrice)) {
      best = o;
      bestD = d;
      bestPrice = o.price;
    }
  }
  return best;
}

/** offres triées : d'abord près du lieu choisi, puis prix */
function buyOffersNearPlace(ship, system, place) {
  const offers = [...buyOffersIn(ship, system)];
  if (!place) return offers;
  return offers.sort((a, b) => {
    const dd =
      distanceLocToPlace(a.location, place) -
      distanceLocToPlace(b.location, place);
    if (dd !== 0) return dd;
    return a.price - b.price;
  });
}

/** achetable en aUEC chez un revendeur du système choisi */
function canBuyIn(ship, system) {
  if (!canBuy(ship)) return false;
  return system === "all" || buyOffersIn(ship, system).length > 0;
}

/** louable chez un loueur du système choisi */
function canRentIn(ship, system) {
  if (!canRent(ship)) return false;
  return system === "all" || rentLocationsIn(ship, system).length > 0;
}

function inCatalog(ship, catalog, system) {
  if (catalog === "all") return true;
  if (catalog === "flight") return ship.productionStatus === "flight-ready";
  // ingame: doit être achetable en aUEC dans le système choisi
  return canBuyIn(ship, system);
}

/** true if this ship is affordable for the selected acquire mode */
function matchMode(ship, budget, acquire, catalog, system, ignoreBudget) {
  const buyPrice = bestBuyPrice(ship, system);
  const buyOk =
    canBuyIn(ship, system) &&
    (ignoreBudget || (buyPrice != null && buyPrice <= budget));
  const rentOk =
    canRentIn(ship, system) && (ignoreBudget || ship.rentDay <= budget);

  // Hors catalogue aUEC : pas de filtre budget achat (pledge / concept)
  if (catalog !== "ingame" && !canBuy(ship)) {
    if (acquire === "rent") return rentOk ? "rent" : null;
    if (acquire === "buy") return "pledge"; // visible sans prix aUEC
    return rentOk ? "rent" : "pledge";
  }

  if (acquire === "buy") return buyOk ? "buy" : null;
  if (acquire === "rent") return rentOk ? "rent" : null;
  if (buyOk) return "buy";
  if (rentOk) return "rent";
  return null;
}

/** rovers / bikes / tanks — pas des vaisseaux aériens */
const GROUND_NAME_RE =
  /^(ATLS(?:\s+GEO)?|MTC|PTV|STV|ROC(?:-DS)?|Cyclone(?:-\w+)?|Ursa(?:\s+\w+)?|Lynx|G12[ar]?|Nova|Ballista(?:\s+\w+)?|Anvil Ballista(?:\s+\w+)?|Centurion|Spartan|Storm(?:\s+AA)?|Ranger\s+\w+|Pulse(?:\s+LX)?|X1(?:\s+\w+)?|Nox(?:\s+\w+)?|Dragonfly(?:\s+\w+)?|HoverQuad|Mule|MDC)\b/i;

function isGround(ship) {
  if (ship.size === "ground" || ship.size === "vehicle") return true;
  if (/^ground$/i.test(String(ship.vehicleType || ""))) return true;
  return GROUND_NAME_RE.test(ship.name || "");
}

function inDomain(ship, domain) {
  if (domain === "both") return true;
  if (domain === "ground") return isGround(ship);
  return !isGround(ship); // air
}

function idsFromUrl() {
  const raw = new URLSearchParams(location.search).get("ids") || "";
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

function filterShips() {
  const budget = Number(budgetInput.value) || 0;
  const roles = selectedRoles();
  const size = sizeSelect.value;
  const domain = domainSelect.value;
  const catalog = catalogSelect.value;
  const acquire = acquireSelect.value;
  const system = systemSelect.value;
  const q = queryInput.value.trim();
  const byName = Boolean(q);
  const place = selectedPlace;
  const hangarIds = idsFromUrl();

  let list = ships
    .map((ship) => {
      const mode = matchMode(ship, budget, acquire, catalog, system, byName || hangarIds);
      const distLocs = locsForPlaceDistance(ship, system, acquire, mode);
      return {
        ...ship,
        score: matchScore(ship, roles),
        matchAcquire: mode,
        distance: shipDistanceToPlace(ship, place, distLocs, []),
      };
    })
    .filter((ship) => (hangarIds ? hangarIds.has(String(ship.id)) : true))
    .filter((ship) => matchesQuery(ship, q))
    .filter((ship) =>
      hangarIds ? true : inCatalog(ship, catalog, system)
    )
    .filter((ship) => (hangarIds ? true : inDomain(ship, domain)))
    .filter((ship) =>
      hangarIds || size === "any" ? true : ship.size === size
    )
    .filter((ship) => ship.matchAcquire != null)
    .filter((ship) => (byName || hangarIds || !roles.length ? true : ship.score > 0));

  const sort = sortSelect.value;
  list.sort((a, b) => {
    // Position choisie : les plus proches d'abord
    if (place) {
      const dd = a.distance - b.distance;
      if (dd !== 0) return dd;
    }
    // Recherche nom : priorité au match exact / début de nom
    if (byName) {
      const nq = normalizeText(q);
      const rank = (s) => {
        const n = normalizeText(s.name);
        if (n === nq) return 0;
        if (n.startsWith(nq)) return 1;
        if (n.includes(nq)) return 2;
        return 3;
      };
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
    }
    // Avec une position : prix chez le revendeur le plus proche (pas le moins cher global)
    const priceOf = (s) => {
      if (s.matchAcquire === "rent") return s.rentDay;
      if (place) {
        const near = nearestBuyOffer(s, system, place);
        if (near) return near.price;
      }
      const best = bestBuyPrice(s, system);
      if (typeof best === "number") return best;
      if (typeof s.priceAuec === "number") return s.priceAuec;
      return Number.MAX_SAFE_INTEGER;
    };
    if (sort === "price-asc") return priceOf(a) - priceOf(b);
    if (sort === "price-desc") return priceOf(b) - priceOf(a);
    if (sort === "cargo") return (b.cargoScu || 0) - (a.cargoScu || 0);
    if (b.score !== a.score) return b.score - a.score;
    return priceOf(a) - priceOf(b);
  });

  return list;
}

function rolesFromUrl() {
  const raw =
    new URLSearchParams(location.search).get("roles") ||
    new URLSearchParams(location.search).get("role") ||
    "";
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => ROLE_IDS.includes(id));
  return ids.length ? ids : null;
}

function renderRoles() {
  const fromDom = roleGrid.querySelectorAll("input:checked").length
    ? selectedRoles()
    : null;
  const checked = new Set(
    fromDom || rolesFromUrl() || ["multipurpose", "cargo"]
  );
  roleGrid.innerHTML = ROLE_IDS.map(
    (id) => `
      <label class="role-chip">
        <input type="checkbox" value="${id}" ${checked.has(id) ? "checked" : ""} />
        <span>${t(`roles.${id}`)}</span>
      </label>`
  ).join("");
}

function shipImage(ship) {
  const na = t("photoNA");
  if (!ship.image) {
    return `<div class="fallback" aria-hidden="true">${na}</div>`;
  }
  return `<img
    src="${ship.image}"
    alt="${ship.name}"
    loading="lazy"
    decoding="async"
    onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',textContent:'${na.replace(/'/g, "\\'")}'}))"
  />`;
}

function matchBars(score) {
  const filled = Math.max(1, Math.round(score * 5));
  return Array.from(
    { length: 5 },
    (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`
  ).join("");
}

function specRow(key, value, highlight) {
  return `<div class="spec">
    <span class="k">${key}</span>
    <span class="v${highlight ? " hi" : ""}">${value}</span>
  </div>`;
}

function adSlotFeed(n) {
  return `
    <aside class="promo-slot promo-slot--feed" aria-label="${t("adLabel")}">
      <span class="promo-label">${t("adLabel")}</span>
      <div class="promo-frame promo-frame--rect" data-slot="infeed-${n}">
        <span class="promo-placeholder">${t("adFeed")}</span>
      </div>
    </aside>`;
}

function shortShop(loc) {
  return String(loc || "")
    .split("—")[0]
    .trim()
    .replace(/\s+Ship Shop$/i, "")
    .replace(/\s+Industries Showroom$/i, "")
    .trim();
}

function renderShipCard(ship, index) {
  const roleTags = ship.roles
    .map((r) => `<span class="tag role">${t(`roles.${r}`)}</span>`)
    .join("");

  const budget = Number(budgetInput.value) || 0;
  const system = systemSelect.value;
  const viaRent = ship.matchAcquire === "rent";
  const place = selectedPlace;
  // Avec une position : on met en avant le revendeur le plus proche, pas le moins cher global
  const offers = place
    ? buyOffersNearPlace(ship, system, place)
    : buyOffersIn(ship, system);
  const focusOffer = offers[0] || null;
  const shipBestPrice = focusOffer
    ? focusOffer.price
    : bestBuyPrice(ship, system);
  const multiShop = !viaRent && offers.length > 1;
  const priceSpread =
    multiShop && offers.some((o) => o.price !== offers[0].price);
  const onSite =
    place && focusOffer && distanceLocToPlace(focusOffer.location, place) === 0;

  let priceLabel;
  let priceSub;
  let priceFrom = "";

  if (viaRent) {
    priceLabel = formatAuec(ship.rentDay);
    priceSub = t("rentDay");
  } else if (!canBuy(ship)) {
    priceLabel = t("outOfAuec");
    priceSub = t("pledgeOnly");
  } else if (shipBestPrice == null) {
    priceLabel = t("outOfSystem", { s: SYSTEM_LABELS[system] });
    priceSub = t("noDealerHere");
  } else {
    priceLabel = formatAuec(shipBestPrice);
    if (offers.length === 1 || (place && focusOffer)) {
      priceSub = shortShop(focusOffer.location);
      if (place && !onSite && multiShop) priceFrom = t("from");
    } else if (multiShop) {
      priceFrom = t("from");
      priceSub = priceSpread
        ? t("bestAtShops", {
            shop: shortShop(offers[0].location),
            n: offers.length,
          })
        : t("nShops", { n: offers.length });
    } else {
      priceSub =
        system === "all"
          ? t("buyIngame")
          : t("buyInSystem", { s: SYSTEM_LABELS[system] });
    }
  }

  // offres : près du lieu d'abord (sinon la moins chère)
  const buy = offers.length
    ? (!place && multiShop ? t("best") : "") +
      offers
        .slice(0, 2)
        .map((o) => `${o.location} — ${formatAuec(o.price)}`)
        .join(" · ") +
      (offers.length > 2
        ? ` · ${
            offers.length - 2 === 1
              ? t("moreOne")
              : t("moreMany", { n: offers.length - 2 })
          }`
        : "")
    : canBuy(ship)
      ? system === "all"
        ? t("dealerIngame")
        : t("noDealerIn", { s: SYSTEM_LABELS[system] })
      : t("notSoldAuec");

  const rentLocs = rentLocationsIn(ship, system);
  const rentFocus = place
    ? [...rentLocs].sort(
        (a, b) =>
          distanceLocToPlace(a, place) - distanceLocToPlace(b, place)
      )[0]
    : rentLocs[0];
  const rent = canRentIn(ship, system)
    ? `${formatAuec(ship.rentDay)}${t("perDay")}${rentFocus ? " · " + rentFocus : ""}`
    : canRent(ship) && system !== "all"
      ? t("noRenterIn", { s: SYSTEM_LABELS[system] })
      : t("rentNotListed");

  const modeTags = [
    isGround(ship)
      ? `<span class="tag mode ground">${t("tagGround")}</span>`
      : `<span class="tag mode air">${t("tagAir")}</span>`,
    place && typeof ship.distance === "number" && ship.distance < 9
      ? `<span class="tag mode near d${ship.distance}">${distanceLabel(ship.distance)}</span>`
      : "",
    canBuyIn(ship, system) && shipBestPrice != null && shipBestPrice <= budget
      ? `<span class="tag mode buy">${t("tagBuyOk")}</span>`
      : "",
    canRentIn(ship, system) && ship.rentDay <= budget
      ? `<span class="tag mode rent">${t("tagRentOk")}</span>`
      : "",
  ].join("");

  const flightReady = ship.productionStatus === "flight-ready";

  return `
    <article class="ship" style="--i:${Math.min(index, 24)}">
      <div class="ship-head">
        <span class="lot">${t("lot", { n: String(index + 1).padStart(3, "0") })}</span>
        <span class="barcode" aria-hidden="true"></span>
        <span class="stamp${flightReady ? "" : " concept"}">${
          flightReady ? t("flightReady") : t("concept")
        }</span>
      </div>

      <div class="ship-media">
        ${shipImage(ship)}
        <span class="price-sticker${multiShop ? " multi" : ""}">
          ${priceFrom ? `<em>${priceFrom}</em>` : ""}
          <b>${priceLabel}</b>
          <i>${priceSub}</i>
        </span>
      </div>

      <div class="ship-body">
        <div>
          <h3 class="ship-name">${ship.name}</h3>
          <p class="ship-mfr">${ship.manufacturer}</p>
        </div>

        <div class="specs">
          ${specRow(t("specRole"), ship.focus || "—")}
          ${specRow(t("specSize"), sizeLabel(ship.size))}
          ${specRow(t("specCrew"), ship.crew)}
          ${specRow(t("specCargo"), `${ship.cargoScu ?? 0} SCU`)}
          ${specRow(t("specBuy"), buy, canBuyIn(ship, system) && shipBestPrice <= budget)}
          ${specRow(t("specRent"), rent, canRentIn(ship, system) && ship.rentDay <= budget)}
        </div>

        <div class="meta">${modeTags}${roleTags}</div>

        <p class="ship-desc">${ship.description}</p>

        <div class="ship-foot">
          <span class="match-meter">
            <span class="bars">${matchBars(ship.score)}</span>
            ${t("compatible", { p: Math.round(ship.score * 100) })}
          </span>
          ${
            ship.pledgeUrl
              ? `<a class="rsi-link" href="${ship.pledgeUrl}" target="_blank" rel="noopener">${t("rsi")}</a>`
              : ""
          }
        </div>
      </div>
    </article>`;
}

function render() {
  if (!hasSearched) {
    resultsCount.textContent = "";
    resultsEl.innerHTML = `<p class="empty-start">${t("emptyStart")}</p>`;
    return;
  }

  const list = filterShips();
  resultsCount.textContent =
    list.length === 1
      ? t("countOne", { total: ships.length })
      : t("countMany", { n: list.length, total: ships.length });

  if (!list.length) {
    resultsEl.innerHTML = `
      <div class="empty">
        ${queryInput.value.trim() ? t("emptyQuery") : t("emptyFilters")}
      </div>`;
    return;
  }

  const AD_EVERY = 6;
  const chunks = [];
  let adN = 0;

  list.forEach((ship, index) => {
    chunks.push(renderShipCard(ship, index));
    if ((index + 1) % AD_EVERY === 0 && index + 1 < list.length) {
      adN += 1;
      chunks.push(adSlotFeed(adN));
    }
  });

  resultsEl.innerHTML = chunks.join("");
  mountAds(resultsEl);
}

/** applique les traductions à tout le texte statique de la page */
function applyI18n() {
  document.documentElement.lang = getLang();

  const setText = (sel, key) => {
    document.querySelectorAll(sel).forEach((el) => (el.textContent = t(key)));
  };
  const setHtml = (sel, key) => {
    document.querySelectorAll(sel).forEach((el) => (el.innerHTML = t(key)));
  };

  // ticker (liste doublée pour l'animation en boucle)
  const tick = t("ticker");
  const track = document.querySelector(".ticker-track");
  if (track && Array.isArray(tick)) {
    track.innerHTML = [...tick, ...tick]
      .map((s) => `<span>${s}</span><i>✦</i>`)
      .join("");
  }

  // masthead
  setText("#nav-home", "navHome");
  setText("#nav-compare", "navCompare");
  setText("#nav-best", "navBest");
  setText("#nav-tools", "navTools");
  setText("#nav-best-all", "bestAllCats");
  document.querySelectorAll("[data-role-label]").forEach((a) => {
    a.textContent = t(`roles.${a.dataset.roleLabel}`);
  });
  setText("#guide-title", "guideTitle");
  setHtml("#guide-p1", "guideP1");
  setHtml("#guide-p2", "guideP2");
  setText("#mast-place", "place");
  setText("#mast-edition", "edition");
  const registryLine = document.querySelector("#registry-line");
  if (registryLine) {
    registryLine.innerHTML = t("registry").replace(
      "{n}",
      `<b id="db-count">${ships.length || "—"}</b>`
    );
  }
  const lede = document.querySelector(".lede");
  if (lede) lede.innerHTML = `<span class="ast">*</span>${t("lede")}`;

  // formulaire
  const formHead = document.querySelectorAll(".form-head span");
  if (formHead[0]) formHead[0].textContent = t("formHead");
  if (formHead[1]) formHead[1].textContent = t("formRef");

  setText('label[for="query"]', "qLabel");
  queryInput.placeholder = t("qPlaceholder");
  if (queryClear) queryClear.setAttribute("aria-label", t("qClear"));
  setText(".query-hint", "qHint");

  setText('label[for="budget"]', "budgetLabel");
  budgetRange.setAttribute("aria-label", t("budgetLabel"));
  setText('label[for="place"]', "placeLabel");
  if (placeInput) placeInput.placeholder = t("placePlaceholder");
  if (placeClear) placeClear.setAttribute("aria-label", t("placeClear"));
  setText(".place-hint", "placeHint");
  setText('label[for="starsystem"]', "sysLabel");
  setText('label[for="catalog"]', "catLabel");
  setText('label[for="domain"]', "domLabel");
  setText('label[for="size"]', "sizeLabel");
  setText('label[for="acquire"]', "acqLabel");
  setText('label[for="sort"]', "sortLabel");

  setText('#starsystem option[value="all"]', "sysAll");
  setText('#catalog option[value="ingame"]', "catIngame");
  setText('#catalog option[value="flight"]', "catFlight");
  setText('#catalog option[value="all"]', "catAll");
  setText('#domain option[value="both"]', "domBoth");
  setText('#domain option[value="air"]', "domAir");
  setText('#domain option[value="ground"]', "domGround");
  setText('#size option[value="any"]', "sizeAny");
  setText('#size option[value="small"]', "sizeSmall");
  setText('#size option[value="medium"]', "sizeMedium");
  setText('#size option[value="large"]', "sizeLarge");
  setText('#size option[value="capital"]', "sizeCapital");
  setText('#size option[value="ground"]', "sizeGround");
  setText('#acquire option[value="buy"]', "acqBuy");
  setText('#acquire option[value="rent"]', "acqRent");
  setText('#acquire option[value="both"]', "acqBoth");
  setText('#sort option[value="match"]', "sortMatch");
  setText('#sort option[value="price-asc"]', "sortPriceAsc");
  setText('#sort option[value="price-desc"]', "sortPriceDesc");
  setText('#sort option[value="cargo"]', "sortCargo");

  setText(".roles legend", "rolesLegend");
  setHtml(".hint", "hint");
  setText(".search-btn", "searchBtn");
  setText(".results-head h2", "resultsTitle");
  setText(".empty-start", "emptyStart");

  // pubs (labels ; placeholders seulement si pas encore montés)
  setText(".promo-label", "adLabel");
  document.querySelectorAll(".promo-slot, .promo-rail").forEach((el) => {
    el.setAttribute("aria-label", t("adLabel"));
  });
  const ph = (sel, key) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.closest(".promo-frame")?.dataset.adMounted === "1") return;
      el.innerHTML = t(key);
    });
  };
  ph('[data-slot="leaderboard"] .promo-placeholder', "adTop");
  ph('[data-slot="footer"] .promo-placeholder', "adBottom");
  ph('[data-slot="sky-left"] .promo-placeholder', "adSky");
  ph('[data-slot="sky-right"] .promo-placeholder', "adSky");

  // pied de page + sélecteur de langue
  setHtml(".site-footer p:not(.footer-links)", "footer");
  setText("#link-legal", "linkLegal");
  setText("#link-privacy", "linkPrivacy");
  const langLabel = document.querySelector('label[for="lang"]');
  if (langLabel) langLabel.textContent = t("langLabel");

  // rafraîchir le texte du portail anti-adblock s'il est ouvert
  const gate = document.querySelector("#access-gate:not([hidden])");
  if (gate) {
    gate.querySelector(".access-gate-title").textContent = t("gateTitle");
    gate.querySelector(".access-gate-body").textContent = t("gateBody");
    gate.querySelector(".access-gate-btn").textContent = t("gateRetry");
  }
}

// Remettre à true une fois le site approuvé par AdSense : tant que Google
// examine le site, un mur bloquant l'empêcherait de voir le contenu.
const GATE_ENABLED = false;

async function enforceAdGate() {
  if (!GATE_ENABLED) return false;
  const blocked = await detectAdBlock();
  if (!blocked) {
    hideGate();
    return false;
  }
  mountGate({
    title: t("gateTitle"),
    body: t("gateBody"),
    retry: t("gateRetry"),
    onRetry: () => {
      enforceAdGate();
    },
  });
  return true;
}

function setupLangSelect() {
  langSelect.innerHTML = LANG_CHOICES.map(
    (l) => `<option value="${l.code}">${l.label}</option>`
  ).join("");
  langSelect.value = getLang();
  langSelect.addEventListener("change", () => {
    setLang(langSelect.value);
    applyI18n();
    renderRoles();
    render();
  });
}

async function init() {
  initLang();
  setupLangSelect();
  renderRoles();
  applyI18n();

  await enforceAdGate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") enforceAdGate();
  });

  const res = await fetch("/data/ships.json");
  ships = await res.json();

  const dbCount = document.querySelector("#db-count");
  if (dbCount) dbCount.textContent = ships.length;

  // lien Google SearchAction / partage : ?q=Cutlass
  const urlQ = new URLSearchParams(location.search).get("q");
  if (urlQ) {
    queryInput.value = urlQ;
    syncQueryClear();
  }

  // afficher une première sélection sans attendre un clic
  hasSearched = true;
  render();
  mountAds();

  budgetInput.addEventListener("input", () => syncBudget(false));
  budgetRange.addEventListener("input", () => syncBudget(true));

  queryInput.addEventListener("input", () => {
    syncQueryClear();
    if (hasSearched) render();
  });

  queryClear?.addEventListener("click", () => {
    queryInput.value = "";
    syncQueryClear();
    queryInput.focus();
    if (hasSearched) render();
  });

  placeInput?.addEventListener("input", () => {
    selectedPlace = null;
    syncPlaceClear();
    const list = suggestPlaces(placeInput.value);
    placeActiveIndex = list.length ? 0 : -1;
    renderPlaceSuggest(list);
  });

  placeInput?.addEventListener("keydown", (e) => {
    const items = [...(placeSuggest?.querySelectorAll("[data-id]") || [])];
    if (!items.length && e.key !== "Escape") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      placeActiveIndex = Math.min(placeActiveIndex + 1, items.length - 1);
      renderPlaceSuggest(suggestPlaces(placeInput.value));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      placeActiveIndex = Math.max(placeActiveIndex - 1, 0);
      renderPlaceSuggest(suggestPlaces(placeInput.value));
    } else if (e.key === "Enter") {
      const active = items[placeActiveIndex] || items[0];
      if (active && !placeSuggest.hidden) {
        e.preventDefault();
        pickPlace(findPlaceById(active.dataset.id));
      } else {
        const resolved = resolvePlace(placeInput.value);
        if (resolved) {
          e.preventDefault();
          pickPlace(resolved);
        }
      }
    } else if (e.key === "Escape") {
      hidePlaceSuggest();
    }
  });

  placeSuggest?.addEventListener("mousedown", (e) => {
    const li = e.target.closest("[data-id]");
    if (!li) return;
    e.preventDefault();
    pickPlace(findPlaceById(li.dataset.id));
  });

  placeInput?.addEventListener("blur", () => {
    setTimeout(() => {
      hidePlaceSuggest();
      if (!selectedPlace && placeInput.value.trim()) {
        const resolved = resolvePlace(placeInput.value);
        if (resolved) pickPlace(resolved);
      }
    }, 120);
  });

  placeInput?.addEventListener("focus", () => {
    const list = suggestPlaces(placeInput.value);
    placeActiveIndex = list.length ? 0 : -1;
    renderPlaceSuggest(list);
  });

  placeClear?.addEventListener("click", () => {
    pickPlace(null);
    placeInput.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (document.documentElement.classList.contains("gate-locked")) return;
    if (!selectedPlace && placeInput?.value.trim()) {
      const resolved = resolvePlace(placeInput.value);
      if (resolved) pickPlace(resolved);
    }
    hasSearched = true;
    render();
    document.querySelector(".results-wrap")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

init();
