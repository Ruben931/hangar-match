import {
  initToolsShell,
  applyToolsChrome,
  loadShips,
  loadCommodities,
  formatAuec,
  formatNum,
  t,
} from "./tools-shell.js";
import { hangarShips } from "./hangar-store.js";

let commodities = [];
let ships = [];
let fetchedAt = "";

function marginPerScu(c) {
  if (typeof c.priceBuy !== "number" || typeof c.priceSell !== "number") {
    return null;
  }
  return c.priceSell - c.priceBuy;
}

function selectedCommodity() {
  const sel = document.querySelector("#trade-commodity");
  if (!sel) return null;
  return commodities.find((c) => String(c.id) === sel.value) || null;
}

function cargoScu() {
  const shipSel = document.querySelector("#trade-ship");
  const manual = document.querySelector("#trade-scu");
  if (shipSel?.value) {
    const ship = ships.find((s) => String(s.id) === shipSel.value);
    if (ship && ship.cargoScu > 0) return ship.cargoScu;
  }
  return Math.max(0, Number(manual?.value) || 0);
}

function fillCommoditySelect() {
  const sel = document.querySelector("#trade-commodity");
  if (!sel) return;
  const prev = sel.value;
  const ranked = [...commodities].sort((a, b) => {
    const ma = marginPerScu(a) ?? -Infinity;
    const mb = marginPerScu(b) ?? -Infinity;
    return mb - ma;
  });
  sel.innerHTML = ranked
    .map((c) => {
      const m = marginPerScu(c);
      const tag =
        m != null && m > 0 ? ` (+${formatNum(m)}/SCU)` : "";
      return `<option value="${c.id}">${c.name}${tag}</option>`;
    })
    .join("");
  if (prev && ranked.some((c) => String(c.id) === prev)) sel.value = prev;
}

function fillShipSelect() {
  const sel = document.querySelector("#trade-ship");
  if (!sel) return;
  const prev = sel.value;
  const owned = hangarShips(ships).filter((s) => (s.cargoScu || 0) > 0);
  const cargoShips = ships
    .filter((s) => (s.cargoScu || 0) >= 4)
    .sort((a, b) => (b.cargoScu || 0) - (a.cargoScu || 0))
    .slice(0, 40);

  const opts = [`<option value="">${t("tradeManualScu")}</option>`];
  if (owned.length) {
    opts.push(
      `<optgroup label="${t("tradeFromHangar")}">`,
      ...owned.map(
        (s) =>
          `<option value="${s.id}">${s.name} — ${s.cargoScu} SCU</option>`
      ),
      `</optgroup>`
    );
  }
  opts.push(
    `<optgroup label="${t("tradeFromCatalog")}">`,
    ...cargoShips.map(
      (s) =>
        `<option value="${s.id}">${s.name} — ${s.cargoScu} SCU</option>`
    ),
    `</optgroup>`
  );
  sel.innerHTML = opts.join("");
  if (prev) sel.value = prev;
}

function syncScuFromShip() {
  const shipSel = document.querySelector("#trade-ship");
  const manual = document.querySelector("#trade-scu");
  if (!shipSel || !manual) return;
  if (!shipSel.value) {
    manual.disabled = false;
    return;
  }
  const ship = ships.find((s) => String(s.id) === shipSel.value);
  if (ship?.cargoScu) {
    manual.value = String(ship.cargoScu);
    manual.disabled = true;
  } else {
    manual.disabled = false;
  }
}

function renderResults() {
  const c = selectedCommodity();
  const scu = cargoScu();
  const goal = Math.max(0, Number(document.querySelector("#trade-goal")?.value) || 0);
  const box = document.querySelector("#trade-results");
  const meta = document.querySelector("#trade-meta");
  if (!box) return;

  if (meta) {
    meta.textContent = fetchedAt
      ? t("tradeDataNote", { date: new Date(fetchedAt).toLocaleDateString() })
      : t("tradeDataNoteShort");
  }

  if (!c) {
    box.innerHTML = `<p class="tools-muted">${t("tradePickCommodity")}</p>`;
    return;
  }

  const buy = c.priceBuy;
  const sell = c.priceSell;
  const margin = marginPerScu(c);
  const tripCost =
    typeof buy === "number" && scu > 0 ? buy * scu : null;
  const tripRevenue =
    typeof sell === "number" && scu > 0 ? sell * scu : null;
  const tripProfit =
    tripCost != null && tripRevenue != null ? tripRevenue - tripCost : null;
  const trips =
    tripProfit != null && tripProfit > 0 && goal > 0
      ? Math.ceil(goal / tripProfit)
      : null;

  box.innerHTML = `
    <ul class="tools-stats">
      <li><span>${t("tradeBuyAvg")}</span><b>${formatAuec(buy)}</b></li>
      <li><span>${t("tradeSellAvg")}</span><b>${formatAuec(sell)}</b></li>
      <li><span>${t("tradeMarginScu")}</span><b class="${
        margin != null && margin > 0 ? "hi" : ""
      }">${margin != null ? formatAuec(margin) : "—"}</b></li>
      <li><span>${t("tradeScuUsed")}</span><b>${formatNum(scu)} SCU</b></li>
      <li><span>${t("tradeTripCost")}</span><b>${
        tripCost != null ? formatAuec(tripCost) : "—"
      }</b></li>
      <li><span>${t("tradeTripRevenue")}</span><b>${
        tripRevenue != null ? formatAuec(tripRevenue) : "—"
      }</b></li>
      <li><span>${t("tradeTripProfit")}</span><b class="hi">${
        tripProfit != null ? formatAuec(tripProfit) : "—"
      }</b></li>
      <li><span>${t("tradeTripsToGoal")}</span><b>${
        trips != null ? formatNum(trips) : "—"
      }</b></li>
    </ul>
    ${
      c.isIllegal
        ? `<p class="tools-warn">${t("tradeIllegalWarn")}</p>`
        : ""
    }
    ${
      c.wiki
        ? `<p class="tools-muted"><a href="${c.wiki}" target="_blank" rel="noopener">${t(
            "tradeWiki"
          )}</a></p>`
        : ""
    }
  `;
}

function topRoutes() {
  const wrap = document.querySelector("#trade-top");
  if (!wrap) return;
  const top = [...commodities]
    .map((c) => ({ c, m: marginPerScu(c) }))
    .filter((x) => x.m != null && x.m > 0 && x.c.isBuyable && x.c.isSellable)
    .sort((a, b) => b.m - a.m)
    .slice(0, 8);

  wrap.innerHTML = `
    <h2>${t("tradeTopTitle")}</h2>
    <ol class="trade-top-list">
      ${top
        .map(
          ({ c, m }) => `
        <li>
          <button type="button" data-pick="${c.id}">
            <strong>${c.name}</strong>
            <span>${formatAuec(m)} / SCU</span>
          </button>
        </li>`
        )
        .join("")}
    </ol>
  `;
}

function applyLabels() {
  applyToolsChrome("trade");
  const title = document.querySelector("#tools-title");
  const lede = document.querySelector("#tools-lede");
  if (title) title.textContent = t("tradeTitle");
  if (lede) lede.textContent = t("tradeLede");
  document.title = `${t("tradeTitle")} — Hangar Match`;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  fillCommoditySelect();
  fillShipSelect();
  syncScuFromShip();
  topRoutes();
  renderResults();
}

function bind() {
  document
    .querySelector("#trade-commodity")
    ?.addEventListener("change", renderResults);
  document.querySelector("#trade-ship")?.addEventListener("change", () => {
    syncScuFromShip();
    renderResults();
  });
  document
    .querySelector("#trade-scu")
    ?.addEventListener("input", renderResults);
  document
    .querySelector("#trade-goal")
    ?.addEventListener("input", renderResults);
  document.querySelector("#trade-top")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pick]");
    if (!btn) return;
    const sel = document.querySelector("#trade-commodity");
    if (sel) {
      sel.value = btn.dataset.pick;
      renderResults();
    }
  });
}

async function init() {
  initToolsShell({
    active: "trade",
    titleKey: "tradeTitle",
    ledeKey: "tradeLede",
    onLangChange: applyLabels,
  });
  const [shipsData, commodityData] = await Promise.all([
    loadShips(),
    loadCommodities(),
  ]);
  ships = shipsData;
  commodities = commodityData.commodities || [];
  fetchedAt = commodityData.fetchedAt || "";
  bind();
  applyLabels();
}

init().catch((err) => {
  console.error(err);
  const box = document.querySelector("#trade-results");
  if (box) box.innerHTML = `<p class="tools-muted">${t("toolsLoadError")}</p>`;
});
