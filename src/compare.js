import {
  initToolsShell,
  applyToolsChrome,
  loadShips,
  formatAuec,
  sizeLabel,
  t,
} from "./tools-shell.js";

let ships = [];

function optionsHtml(selected) {
  const sorted = [...ships].sort((a, b) => a.name.localeCompare(b.name));
  return (
    `<option value="">${t("comparePick")}</option>` +
    sorted
      .map(
        (s) =>
          `<option value="${s.id}" ${
            s.id === selected ? "selected" : ""
          }>${s.name}</option>`
      )
      .join("")
  );
}

function shipById(id) {
  return ships.find((s) => String(s.id) === String(id)) || null;
}

function rolesLine(ship) {
  if (!ship?.roles?.length) return "—";
  return ship.roles.map((r) => t(`roles.${r}`) || r).join(", ");
}

function dealers(ship) {
  const locs = ship?.buyLocations || [];
  if (!locs.length) return t("notSoldAuec");
  return locs.slice(0, 3).join(" · ") + (locs.length > 3 ? ` (+${locs.length - 3})` : "");
}

function thumb(ship) {
  if (!ship?.image) return `<div class="compare-thumb fallback">${t("photoNA")}</div>`;
  return `<img class="compare-thumb" src="${ship.image}" alt="${ship.name}" />`;
}

function cell(a, b, fmt) {
  const va = fmt(a);
  const vb = fmt(b);
  return `<td>${va}</td><td>${vb}</td>`;
}

function renderTable() {
  const a = shipById(document.querySelector("#compare-a")?.value);
  const b = shipById(document.querySelector("#compare-b")?.value);
  const wrap = document.querySelector("#compare-table");
  if (!wrap) return;

  if (!a && !b) {
    wrap.innerHTML = `<p class="tools-muted">${t("compareHint")}</p>`;
    return;
  }

  const rows = [
    [t("specBuy"), (s) => (typeof s?.priceAuec === "number" ? formatAuec(s.priceAuec) : t("outOfAuec"))],
    [t("specRent"), (s) => (s?.rentDay ? `${formatAuec(s.rentDay)} ${t("perDay")}` : "—")],
    [t("specCargo"), (s) => (s?.cargoScu > 0 ? `${s.cargoScu} SCU` : "—")],
    [t("specCrew"), (s) => s?.crew || "—"],
    [t("specSize"), (s) => sizeLabel(s?.size)],
    [t("specRole"), (s) => rolesLine(s)],
    [t("compareManufacturer"), (s) => s?.manufacturer || "—"],
    [t("compareStatus"), (s) => (s?.productionStatus === "flight-ready" ? t("flightReady") : s?.productionStatus || "—")],
    [t("dealerIngame"), (s) => dealers(s)],
  ];

  wrap.innerHTML = `
    <div class="compare-heads">
      <div class="compare-col">
        ${thumb(a)}
        <h3>${a?.name || "—"}</h3>
        ${
          a
            ? `<a class="best-link" href="/?q=${encodeURIComponent(a.name)}">${t(
                "bestOpenCompare"
              )}</a>`
            : ""
        }
      </div>
      <div class="compare-col">
        ${thumb(b)}
        <h3>${b?.name || "—"}</h3>
        ${
          b
            ? `<a class="best-link" href="/?q=${encodeURIComponent(b.name)}">${t(
                "bestOpenCompare"
              )}</a>`
            : ""
        }
      </div>
    </div>
    <table class="compare-grid">
      <tbody>
        ${rows
          .map(
            ([label, fmt]) => `
          <tr>
            <th scope="row">${label}</th>
            ${cell(a, b, fmt)}
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function applyFromUrl() {
  const params = new URLSearchParams(location.search);
  const a = params.get("a");
  const b = params.get("b");
  const selA = document.querySelector("#compare-a");
  const selB = document.querySelector("#compare-b");
  if (a && selA) selA.value = a;
  if (b && selB) selB.value = b;
}

function syncUrl() {
  const a = document.querySelector("#compare-a")?.value || "";
  const b = document.querySelector("#compare-b")?.value || "";
  const url = new URL(location.href);
  if (a) url.searchParams.set("a", a);
  else url.searchParams.delete("a");
  if (b) url.searchParams.set("b", b);
  else url.searchParams.delete("b");
  history.replaceState(null, "", url);
}

function applyLabels() {
  applyToolsChrome("compare");
  const title = document.querySelector("#tools-title");
  const lede = document.querySelector("#tools-lede");
  if (title) title.textContent = t("compareTitle");
  if (lede) lede.textContent = t("compareLede");
  document.title = `${t("compareTitle")} — Hangar Match`;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  const a = document.querySelector("#compare-a");
  const b = document.querySelector("#compare-b");
  const prevA = a?.value;
  const prevB = b?.value;
  if (a) a.innerHTML = optionsHtml(prevA);
  if (b) b.innerHTML = optionsHtml(prevB);
  renderTable();
}

function bind() {
  document.querySelector("#compare-a")?.addEventListener("change", () => {
    syncUrl();
    renderTable();
  });
  document.querySelector("#compare-b")?.addEventListener("change", () => {
    syncUrl();
    renderTable();
  });
  document.querySelector("#compare-swap")?.addEventListener("click", () => {
    const a = document.querySelector("#compare-a");
    const b = document.querySelector("#compare-b");
    if (!a || !b) return;
    const tmp = a.value;
    a.value = b.value;
    b.value = tmp;
    syncUrl();
    renderTable();
  });
}

async function init() {
  initToolsShell({
    active: "compare",
    titleKey: "compareTitle",
    ledeKey: "compareLede",
    onLangChange: applyLabels,
  });
  ships = await loadShips();
  const a = document.querySelector("#compare-a");
  const b = document.querySelector("#compare-b");
  if (a) a.innerHTML = optionsHtml("");
  if (b) b.innerHTML = optionsHtml("");
  applyFromUrl();
  bind();
  applyLabels();
}

init().catch((err) => {
  console.error(err);
  const wrap = document.querySelector("#compare-table");
  if (wrap) wrap.innerHTML = `<p class="tools-muted">${t("toolsLoadError")}</p>`;
});
