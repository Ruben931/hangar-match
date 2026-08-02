/**
 * Shell partagé des pages /outils/*
 */
import {
  LANG_CHOICES,
  initLang,
  getLang,
  setLang,
  localeOf,
  t,
} from "./i18n.js";
import { mountAds } from "./ads.js";
import { getHangarIds } from "./hangar-store.js";
import { initTeaserCompact } from "./teaser-compact.js";

export { t, getLang, localeOf };

export function formatAuec(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return (
    new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 0 }).format(n) +
    " aUEC"
  );
}

export function formatNum(n, digits = 0) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(localeOf(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function sizeLabel(size) {
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

function fillLangSelect(onChange) {
  const sel = document.querySelector("#lang");
  if (!sel) return;
  sel.innerHTML = LANG_CHOICES.map(
    (l) =>
      `<option value="${l.code}" ${l.code === getLang() ? "selected" : ""}>${l.label}</option>`
  ).join("");
  sel.addEventListener("change", () => {
    setLang(sel.value);
    if (onChange) onChange();
    else location.reload();
  });
}

export function applyToolsChrome(active) {
  document.documentElement.lang = getLang();

  const setText = (sel, key) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.textContent = t(key);
    });
  };

  setText("#nav-compare", "navCompare");
  setText("#nav-best", "navBest");
  setText("#nav-tools", "navTools");
  setText("#nav-app", "navApp");
  setText("#link-legal", "linkLegal");
  setText("#link-privacy", "linkPrivacy");
  setText(".promo-label", "adLabel");
  setText("#app-teaser-stamp", "appTeaserStamp");
  setText("#app-teaser-title", "appTeaserTitle");
  setText("#app-teaser-text", "appTeaserText");
  setText("#app-teaser-cta", "appTeaserCta");

  const footer = document.querySelector("#footer-copy");
  if (footer) footer.innerHTML = t("footer");

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

  document.querySelectorAll(".promo-slot, .promo-rail").forEach((el) => {
    el.setAttribute("aria-label", t("adLabel"));
  });

  document.querySelectorAll(".mode-nav-btn").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.nav === active);
    if (a.dataset.nav === active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  document.querySelectorAll(".tools-subnav a").forEach((a) => {
    const isOn = a.dataset.tool === active;
    a.classList.toggle("is-active", isOn);
    if (isOn) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  const badge = document.querySelector("#hangar-badge");
  if (badge) {
    const n = getHangarIds().length;
    badge.textContent = n ? String(n) : "";
    badge.hidden = !n;
  }

  const langLabel = document.querySelector('label[for="lang"]');
  if (langLabel) langLabel.textContent = t("langLabel");
}

export function initToolsShell({ active, onLangChange, titleKey, ledeKey }) {
  initLang();
  fillLangSelect(onLangChange);
  applyToolsChrome(active);

  if (titleKey) {
    const h1 = document.querySelector("#tools-title");
    if (h1) h1.textContent = t(titleKey);
    document.title = `${t(titleKey)} — Hangar Match`;
  }
  if (ledeKey) {
    const lede = document.querySelector("#tools-lede");
    if (lede) lede.textContent = t(ledeKey);
  }

  mountAds();
  initTeaserCompact();
}

export async function loadShips() {
  const res = await fetch("/data/ships.json");
  if (!res.ok) throw new Error("ships.json");
  return res.json();
}

export async function loadCommodities() {
  const res = await fetch("/data/commodities.json");
  if (!res.ok) throw new Error("commodities.json");
  return res.json();
}

/** Markup nav sous-outils (hub / hangar / trade / compare) */
export function toolsSubnavHtml() {
  return `
    <nav class="tools-subnav" aria-label="Outils">
      <a href="/outils.html" data-tool="hub">${t("toolsNavHub")}</a>
      <a href="/outils/hangar.html" data-tool="hangar">${t("toolsNavHangar")}<span id="hangar-badge" class="hangar-badge" hidden></span></a>
      <a href="/outils/trade.html" data-tool="trade">${t("toolsNavTrade")}</a>
      <a href="/outils/comparer.html" data-tool="compare">${t("toolsNavCompare")}</a>
    </nav>
  `;
}
