import {
  initToolsShell,
  applyToolsChrome,
  loadShips,
  formatAuec,
  sizeLabel,
  t,
} from "./tools-shell.js";
import {
  getHangarIds,
  addToHangar,
  removeFromHangar,
  hangarShips,
  hangarCompareUrl,
} from "./hangar-store.js";

let ships = [];

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function shipThumb(ship) {
  if (!ship.image) {
    return `<div class="best-thumb fallback">${t("photoNA")}</div>`;
  }
  return `<img class="best-thumb" src="${ship.image}" alt="${ship.name}" loading="lazy" decoding="async" />`;
}

function renderTotals(owned) {
  const el = document.querySelector("#hangar-totals");
  if (!el) return;
  const value = owned.reduce(
    (sum, s) => sum + (typeof s.priceAuec === "number" ? s.priceAuec : 0),
    0
  );
  const cargo = owned.reduce((sum, s) => sum + (s.cargoScu || 0), 0);
  el.innerHTML = `
    <li><span>${t("hangarCount")}</span><b>${owned.length}</b></li>
    <li><span>${t("hangarValue")}</span><b>${formatAuec(value)}</b></li>
    <li><span>${t("hangarCargo")}</span><b>${cargo} SCU</b></li>
  `;
}

function renderOwned() {
  const list = document.querySelector("#hangar-list");
  const empty = document.querySelector("#hangar-empty");
  const cta = document.querySelector("#hangar-open-compare");
  const owned = hangarShips(ships);
  renderTotals(owned);

  if (cta) {
    cta.href = hangarCompareUrl();
    cta.hidden = !owned.length;
    cta.textContent = t("hangarOpenCompare");
  }

  if (!owned.length) {
    if (list) list.innerHTML = "";
    if (empty) {
      empty.hidden = false;
      empty.textContent = t("hangarEmpty");
    }
    return;
  }
  if (empty) empty.hidden = true;

  if (list) {
    list.innerHTML = owned
      .map(
        (ship) => `
      <article class="best-card hangar-card" data-id="${ship.id}">
        ${shipThumb(ship)}
        <div class="best-body">
          <h3>${ship.name}</h3>
          <p class="best-meta">${ship.manufacturer || ""} · ${sizeLabel(ship.size)}</p>
          <ul class="best-stats">
            <li><span>${t("specBuy")}</span><b>${
              typeof ship.priceAuec === "number"
                ? formatAuec(ship.priceAuec)
                : t("outOfAuec")
            }</b></li>
            <li><span>${t("specCargo")}</span><b>${
              ship.cargoScu > 0 ? `${ship.cargoScu} SCU` : "—"
            }</b></li>
            <li><span>${t("specCrew")}</span><b>${ship.crew || "—"}</b></li>
          </ul>
          <button type="button" class="hangar-remove" data-remove="${ship.id}">${t(
            "hangarRemove"
          )}</button>
        </div>
      </article>`
      )
      .join("");
  }
}

function renderSuggestions(q) {
  const box = document.querySelector("#hangar-suggest");
  if (!box) return;
  const nq = normalize(q);
  if (nq.length < 1) {
    box.innerHTML = "";
    box.hidden = true;
    return;
  }
  const owned = new Set(getHangarIds());
  const hits = ships
    .filter((s) => {
      const hay = normalize(`${s.name} ${s.manufacturer} ${s.matrixName || ""}`);
      return hay.includes(nq);
    })
    .slice(0, 12);

  if (!hits.length) {
    box.innerHTML = `<p class="tools-muted">${t("hangarNoMatch")}</p>`;
    box.hidden = false;
    return;
  }

  box.hidden = false;
  box.innerHTML = hits
    .map((s) => {
      const inH = owned.has(String(s.id));
      return `
      <button type="button" class="hangar-suggest-row" data-add="${s.id}" ${
        inH ? "disabled" : ""
      }>
        <span><strong>${s.name}</strong> · ${s.manufacturer || ""}</span>
        <span>${inH ? t("hangarInHangar") : t("hangarAdd")}</span>
      </button>`;
    })
    .join("");
}

function bind() {
  const input = document.querySelector("#hangar-search");
  const suggest = document.querySelector("#hangar-suggest");
  const list = document.querySelector("#hangar-list");

  input?.addEventListener("input", () => renderSuggestions(input.value));

  suggest?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn || btn.disabled) return;
    addToHangar(btn.dataset.add);
    renderOwned();
    renderSuggestions(input?.value || "");
    applyToolsChrome("hangar");
  });

  list?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    removeFromHangar(btn.dataset.remove);
    renderOwned();
    renderSuggestions(input?.value || "");
    applyToolsChrome("hangar");
  });
}

function applyLabels() {
  applyToolsChrome("hangar");
  const title = document.querySelector("#tools-title");
  const lede = document.querySelector("#tools-lede");
  if (title) title.textContent = t("hangarTitle");
  if (lede) lede.textContent = t("hangarLede");
  document.title = `${t("hangarTitle")} — Hangar Match`;

  const label = document.querySelector('label[for="hangar-search"]');
  if (label) label.textContent = t("hangarSearchLabel");
  const input = document.querySelector("#hangar-search");
  if (input) input.placeholder = t("hangarSearchPlaceholder");

  renderOwned();
  if (input?.value) renderSuggestions(input.value);
}

async function init() {
  initToolsShell({
    active: "hangar",
    titleKey: "hangarTitle",
    ledeKey: "hangarLede",
    onLangChange: applyLabels,
  });
  ships = await loadShips();
  bind();
  applyLabels();
}

init().catch((err) => {
  console.error(err);
  const empty = document.querySelector("#hangar-empty");
  if (empty) {
    empty.hidden = false;
    empty.textContent = t("toolsLoadError");
  }
});
