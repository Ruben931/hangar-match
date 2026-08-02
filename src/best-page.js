import {
  LANG_CHOICES,
  initLang,
  getLang,
  setLang,
  localeOf,
  t,
} from "./i18n.js";
import {
  CATEGORIES,
  categoryBySlug,
  catText,
} from "./categories.js";
import { mountAds } from "./ads.js";

const pageRole = document.body.dataset.role || "";
const pageSlug = document.body.dataset.slug || "";
const isHub = !pageRole;

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

function formatAuec(n) {
  if (typeof n !== "number") return "—";
  return (
    new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 0 }).format(n) +
    " aUEC"
  );
}

const GROUND_NAME_RE =
  /^(ATLS(?:\s+GEO)?|MTC|PTV|STV|ROC(?:-DS)?|Cyclone(?:-\w+)?|Ursa(?:\s+\w+)?|Lynx|G12[ar]?|Nova|Ballista(?:\s+\w+)?|Anvil Ballista(?:\s+\w+)?|Centurion|Spartan|Storm(?:\s+AA)?|Ranger\s+\w+|Pulse(?:\s+LX)?|X1(?:\s+\w+)?|Nox(?:\s+\w+)?|Dragonfly(?:\s+\w+)?|HoverQuad|Mule|MDC)\b/i;

function isGround(ship) {
  if (ship.size === "ground" || ship.size === "vehicle") return true;
  if (/^ground$/i.test(String(ship.vehicleType || ""))) return true;
  return GROUND_NAME_RE.test(ship.name || "");
}

function scoreBest(ship, role) {
  let score = 0;
  if (ship.roles?.includes(role)) score += 20;
  if (ship.productionStatus === "flight-ready") score += 8;
  if (typeof ship.priceAuec === "number" && ship.priceAuec > 0) score += 12;
  else score -= 6;
  if (role === "cargo" || role === "trading") {
    score += Math.min(25, (ship.cargoScu || 0) / 24);
  }
  if (role === "starter" && ship.priceAuec && ship.priceAuec < 1_500_000) {
    score += 10;
  }
  if (ship.roles?.[0] === role) score += 3;
  if (ship.rentDay) score += 1;
  return score;
}

function rankShips(ships, role) {
  // mining : les ROC / ATLS comptent ; ailleurs on garde les vaisseaux aériens
  const allowGround = role === "mining";
  return ships
    .filter((s) => s.roles?.includes(role))
    .filter((s) => allowGround || !isGround(s))
    .map((s) => ({ ...s, bestScore: scoreBest(s, role) }))
    .sort((a, b) => {
      const ds = b.bestScore - a.bestScore;
      if (ds !== 0) return ds;
      const pa = a.priceAuec ?? Number.MAX_SAFE_INTEGER;
      const pb = b.priceAuec ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      if (role === "cargo") return (b.cargoScu || 0) - (a.cargoScu || 0);
      return a.name.localeCompare(b.name);
    });
}

function shipThumb(ship) {
  if (!ship.image) {
    return `<div class="best-thumb fallback">${t("photoNA")}</div>`;
  }
  return `<img class="best-thumb" src="${ship.image}" alt="${ship.name}" loading="lazy" decoding="async" />`;
}

function renderShipRow(ship, index, role) {
  const price =
    typeof ship.priceAuec === "number"
      ? formatAuec(ship.priceAuec)
      : t("outOfAuec");
  const cargo =
    ship.cargoScu > 0 ? `${ship.cargoScu} SCU` : "—";
  const shop = (ship.buyLocations || [])[0] || "";
  const compareUrl = `/?roles=${encodeURIComponent(role)}&q=${encodeURIComponent(ship.name)}`;

  return `
    <article class="best-card" style="--i:${Math.min(index, 16)}">
      <span class="best-rank">${String(index + 1).padStart(2, "0")}</span>
      ${shipThumb(ship)}
      <div class="best-body">
        <h3>${ship.name}</h3>
        <p class="best-meta">${ship.manufacturer || ""} · ${sizeLabel(ship.size)}${
          ship.productionStatus === "flight-ready" ? ` · ${t("flightReady")}` : ""
        }</p>
        <ul class="best-stats">
          <li><span>${t("specBuy")}</span><b>${price}</b></li>
          <li><span>${t("specCargo")}</span><b>${cargo}</b></li>
          <li><span>${t("specCrew")}</span><b>${ship.crew || "—"}</b></li>
        </ul>
        ${shop ? `<p class="best-shop">${shop}</p>` : ""}
        <a class="best-link" href="${compareUrl}">${t("bestOpenCompare")}</a>
      </div>
    </article>
  `;
}

function renderHub() {
  const lang = getLang();
  const grid = document.querySelector("#best-categories");
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map((c) => {
    const title = catText(c, "title", lang);
    const desc = catText(c, "description", lang);
    return `
      <a class="cat-tile" href="/meilleurs-vaisseaux/${c.slug}.html">
        <span class="cat-tile-role">${t(`roles.${c.role}`)}</span>
        <strong>${title}</strong>
        <span class="cat-tile-desc">${desc}</span>
      </a>
    `;
  }).join("");
}

function renderCategory(ships) {
  const cat = categoryBySlug(pageSlug) || CATEGORIES.find((c) => c.role === pageRole);
  if (!cat) return;
  const lang = getLang();
  const ranked = rankShips(ships, cat.role);
  const withPrice = ranked.filter((s) => typeof s.priceAuec === "number");
  const top = (withPrice.length >= 6 ? withPrice : ranked).slice(0, 12);

  const h1 = document.querySelector("#best-title");
  const intro = document.querySelector("#best-intro");
  const list = document.querySelector("#best-list");
  const count = document.querySelector("#best-count");
  const cta = document.querySelector("#best-cta");

  if (h1) h1.textContent = catText(cat, "title", lang);
  if (intro) intro.textContent = catText(cat, "intro", lang);
  if (count) {
    count.textContent = t("bestCount", { n: String(top.length), total: String(ranked.length) });
  }
  if (list) {
    list.innerHTML = top.length
      ? top.map((s, i) => renderShipRow(s, i, cat.role)).join("")
      : `<p class="empty-filters">${t("bestEmpty")}</p>`;
  }
  if (cta) {
    cta.href = `/?roles=${encodeURIComponent(cat.role)}`;
    cta.textContent = t("bestCtaCompare");
  }

  document.title = `${catText(cat, "title", lang)} — Hangar Match`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", catText(cat, "description", lang));
}

function applyChrome() {
  const setText = (sel, key) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = t(key);
  };
  setText("#nav-home", "navHome");
  setText("#nav-compare", "navCompare");
  setText("#nav-best", "navBest");
  setText("#nav-tools", "navTools");
  setText("#nav-app", "navApp");
  setText("#app-teaser-stamp", "appTeaserStamp");
  setText("#app-teaser-title", "appTeaserTitle");
  setText("#app-teaser-text", "appTeaserText");
  setText("#app-teaser-cta", "appTeaserCta");
  setText("#link-legal", "linkLegal");
  setText("#link-privacy", "linkPrivacy");
  setText("#best-hub-title", "bestHubTitle");
  setText("#best-hub-lede", "bestHubLede");
  setText("#best-back", "bestBack");
  setText("#best-also", "bestAlsoTitle");
  setText("#best-hub-compare-title", "bestHubCompareTitle");
  const hubCompare = document.querySelector("#best-hub-compare-body");
  if (hubCompare) hubCompare.innerHTML = t("bestHubCompareBody");

  const footer = document.querySelector("#footer-copy");
  if (footer) footer.innerHTML = t("footer");

  document.documentElement.lang = getLang();
}

function fillLangSelect() {
  const sel = document.querySelector("#lang");
  if (!sel) return;
  sel.innerHTML = LANG_CHOICES.map(
    (l) =>
      `<option value="${l.code}" ${l.code === getLang() ? "selected" : ""}>${l.label}</option>`
  ).join("");
  sel.addEventListener("change", () => {
    setLang(sel.value);
    location.reload();
  });
}

function renderAlso() {
  const wrap = document.querySelector("#best-also-grid");
  if (!wrap || isHub) return;
  const others = CATEGORIES.filter((c) => c.slug !== pageSlug).slice(0, 6);
  const lang = getLang();
  wrap.innerHTML = others
    .map(
      (c) =>
        `<a class="cat-tile cat-tile--compact" href="/meilleurs-vaisseaux/${c.slug}.html">
          <span class="cat-tile-role">${t(`roles.${c.role}`)}</span>
          <strong>${catText(c, "title", lang)}</strong>
        </a>`
    )
    .join("");
}

async function init() {
  initLang();
  fillLangSelect();
  applyChrome();

  if (isHub) {
    document.title = `${t("bestHubTitle")} — Hangar Match`;
    renderHub();
    mountAds();
    return;
  }

  const res = await fetch("/data/ships.json");
  const ships = await res.json();
  const db = document.querySelector("#db-count");
  if (db) db.textContent = ships.length;
  renderCategory(ships);
  renderAlso();
  mountAds();
}

init();
