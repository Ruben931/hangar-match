import "./index.css";
import { DATA } from "./config.js";

const HANGAR_KEY = "hm-desktop-hangar";
const state = {
  page: "session",
  licensed: false,
  licenseInfo: null,
  game: null,
  events: [],
  ships: [],
  commodities: [],
  hangar: loadHangar(),
};

function loadHangar() {
  try {
    return JSON.parse(localStorage.getItem(HANGAR_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHangar() {
  localStorage.setItem(HANGAR_KEY, JSON.stringify(state.hangar));
}

function fmt(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " aUEC";
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

async function refreshLicense() {
  state.licenseInfo = await window.hm.licenseStatus();
  state.licensed = Boolean(state.licenseInfo?.licensed);
}

async function refreshGame() {
  state.game = await window.hm.gameStatus();
}

async function loadData() {
  const [shipsRes, comRes] = await Promise.all([
    fetch(DATA.shipsUrl),
    fetch(DATA.commoditiesUrl),
  ]);
  state.ships = await shipsRes.json();
  const com = await comRes.json();
  state.commodities = com.commodities || [];
}

function renderGate() {
  const app = document.querySelector("#app");
  app.innerHTML = "";
  const box = el(`
    <div class="gate">
      <h1>Hangar Match<span style="color:var(--red)">*</span></h1>
      <p class="lede">App Windows payante — outils + connexion locale au jeu (processus & Game.log).</p>
      <label for="key">Clé de licence Lemon Squeezy</label>
      <input id="key" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      <p class="muted" id="gate-err" hidden></p>
      <div class="btn-row">
        <button class="btn" id="activate">Activer</button>
        <button class="btn secondary" id="buy">Acheter</button>
      </div>
      <p class="muted" style="margin-top:1rem">Dev : clé <code>DEV-LOCAL</code> ou variable d’env <code>HM_DEV=1</code>.</p>
    </div>
  `);
  app.appendChild(box);
  box.querySelector("#buy").onclick = () => window.hm.openCheckout();
  box.querySelector("#activate").onclick = async () => {
    const key = box.querySelector("#key").value;
    const res = await window.hm.activateLicense(key);
    const err = box.querySelector("#gate-err");
    if (!res.ok) {
      err.hidden = false;
      err.textContent = res.error || "Échec";
      err.className = "warn";
      return;
    }
    await refreshLicense();
    render();
  };
}

function shell(contentHtml) {
  const g = state.game;
  const running = g?.running;
  return `
    <header class="topbar">
      <div class="brand">Hangar Match <span>*</span> Desktop</div>
      <div class="status-pill ${running ? "on" : "off"}" title="${g?.note || ""}">
        <i class="dot"></i>
        ${running ? "Star Citizen détecté" : "Jeu non détecté"}
      </div>
    </header>
    <div class="layout">
      <nav class="nav">
        <button data-page="session" class="${state.page === "session" ? "active" : ""}">Session jeu</button>
        <button data-page="hangar" class="${state.page === "hangar" ? "active" : ""}">Mon hangar</button>
        <button data-page="trade" class="${state.page === "trade" ? "active" : ""}">Trade</button>
        <button data-page="compare" class="${state.page === "compare" ? "active" : ""}">Comparer</button>
        <button data-page="notes" class="${state.page === "notes" ? "active" : ""}">Notes run</button>
        <button data-page="account" class="${state.page === "account" ? "active" : ""}">Licence</button>
      </nav>
      <main class="main">${contentHtml}</main>
    </div>
  `;
}

function pageSession() {
  const g = state.game || {};
  const events = state.events.slice().reverse();
  return `
    <h1>Session jeu</h1>
    <p class="lede">Connexion locale : détection du processus + lecture du <b>Game.log</b>. Pas de lecture mémoire, pas d’API serveur CIG.</p>
    <div class="grid-3">
      <div class="stat"><span>Client</span><b>${g.running ? "En cours" : "Arrêté"}</b></div>
      <div class="stat"><span>Game.log</span><b>${g.logPath ? "Trouvé" : "Introuvable"}</b></div>
      <div class="stat"><span>Pont</span><b class="${g.connected ? "hi" : ""}">${g.connected ? "Actif" : "En attente"}</b></div>
    </div>
    <div class="panel" style="margin-top:1rem">
      <p class="muted" style="margin:0 0 0.5rem">${g.logPath || "Cherche dans Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log"}</p>
      <div class="btn-row">
        <button class="btn" id="refresh-game">Rafraîchir</button>
        <button class="btn secondary" id="read-log">Lire le log</button>
      </div>
    </div>
    <div class="panel">
      <h2 style="margin:0 0 0.6rem;font-size:1rem;text-transform:uppercase">Événements récents</h2>
      <ul class="event-list" id="events">
        ${
          events.length
            ? events
                .map(
                  (e) =>
                    `<li><span class="tag">${e.type}</span>${e.message}<div class="muted">${escapeHtml(
                      e.raw || ""
                    )}</div></li>`
                )
                .join("")
            : `<li class="muted">Aucun événement parsé pour l’instant — lance le jeu puis « Lire le log ».</li>`
        }
      </ul>
    </div>
  `;
}

function pageHangar() {
  const owned = state.ships.filter((s) => state.hangar.includes(s.id));
  const value = owned.reduce((a, s) => a + (s.priceAuec || 0), 0);
  const cargo = owned.reduce((a, s) => a + (s.cargoScu || 0), 0);
  return `
    <h1>Mon hangar</h1>
    <p class="lede">Liste locale de tes vaisseaux (cet appareil).</p>
    <div class="grid-3">
      <div class="stat"><span>Appareils</span><b>${owned.length}</b></div>
      <div class="stat"><span>Valeur aUEC</span><b>${fmt(value)}</b></div>
      <div class="stat"><span>Cargo</span><b>${cargo} SCU</b></div>
    </div>
    <div class="panel">
      <label for="hs">Ajouter</label>
      <input id="hs" type="search" placeholder="Cutlass, Aurora…" />
      <div class="suggest" id="hsuggest"></div>
    </div>
    <div class="ship-list" id="hlist">
      ${
        owned.length
          ? owned
              .map(
                (s) => `
        <article class="ship-card">
          <h3>${s.name}</h3>
          <p class="muted">${s.manufacturer || ""} · ${s.cargoScu || 0} SCU</p>
          <p><b>${typeof s.priceAuec === "number" ? fmt(s.priceAuec) : "—"}</b></p>
          <button class="btn danger" data-rm="${s.id}">Retirer</button>
        </article>`
              )
              .join("")
          : `<p class="muted">Hangar vide.</p>`
      }
    </div>
  `;
}

function pageTrade() {
  const ranked = [...state.commodities]
    .map((c) => ({
      ...c,
      m:
        typeof c.priceBuy === "number" && typeof c.priceSell === "number"
          ? c.priceSell - c.priceBuy
          : null,
    }))
    .filter((c) => c.m != null)
    .sort((a, b) => b.m - a.m);
  const opts = ranked
    .slice(0, 80)
    .map((c) => `<option value="${c.id}">${c.name} (+${Math.round(c.m)}/SCU)</option>`)
    .join("");
  const hangarCargo = state.ships
    .filter((s) => state.hangar.includes(s.id) && s.cargoScu > 0)
    .map((s) => `<option value="${s.cargoScu}">${s.name} — ${s.cargoScu} SCU</option>`)
    .join("");
  return `
    <h1>Rentabilité cargo</h1>
    <p class="lede">Moyennes UEX (snapshot hangarmatch.org) — pas des prix live serveur.</p>
    <div class="panel grid-2">
      <div>
        <label for="commodity">Marchandise</label>
        <select id="commodity">${opts}</select>
      </div>
      <div>
        <label for="scu">SCU</label>
        <select id="shipscu">
          <option value="">Manuel</option>
          ${hangarCargo}
        </select>
        <input id="scu" type="number" value="46" min="0" style="margin-top:0.4rem" />
      </div>
      <div>
        <label for="goal">Objectif aUEC</label>
        <input id="goal" type="number" value="1000000" />
      </div>
    </div>
    <div class="panel" id="trade-out"></div>
  `;
}

function pageCompare() {
  const opts = state.ships
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");
  return `
    <h1>Comparer</h1>
    <p class="lede">Deux vaisseaux côte à côte.</p>
    <div class="panel grid-2">
      <div>
        <label for="ca">Vaisseau A</label>
        <select id="ca"><option value="">—</option>${opts}</select>
      </div>
      <div>
        <label for="cb">Vaisseau B</label>
        <select id="cb"><option value="">—</option>${opts}</select>
      </div>
    </div>
    <div class="panel" id="compare-out"></div>
  `;
}

function pageNotes() {
  const notes = localStorage.getItem("hm-desktop-notes") || "";
  return `
    <h1>Notes de run</h1>
    <p class="lede">Bloc-notes local pour tes sessions (routes, profits, bugs).</p>
    <div class="panel">
      <textarea id="notes">${escapeHtml(notes)}</textarea>
      <div class="btn-row">
        <button class="btn" id="save-notes">Enregistrer</button>
      </div>
    </div>
  `;
}

function pageAccount() {
  const info = state.licenseInfo || {};
  const s = info.stored || {};
  return `
    <h1>Licence</h1>
    <div class="panel">
      <div class="grid-2">
        <div class="stat"><span>Produit</span><b>${info.product || "—"}</b></div>
        <div class="stat"><span>Version</span><b>${info.version || "—"}</b></div>
        <div class="stat"><span>Statut</span><b>${info.licensed ? "Active" : "Inactive"}</b></div>
        <div class="stat"><span>Mode</span><b>${s.mode || "—"}</b></div>
      </div>
      <p class="muted" style="margin-top:0.75rem">Paiement via Lemon Squeezy (le plus simple : checkout + clé licence).</p>
      <div class="btn-row">
        <button class="btn" id="buy2">Acheter / renouveler</button>
        <button class="btn secondary" id="site">hangarmatch.org/app</button>
        <button class="btn danger" id="clear-lic">Désactiver sur ce PC</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTradeOut() {
  const id = document.querySelector("#commodity")?.value;
  const c = state.commodities.find((x) => String(x.id) === String(id));
  const scu = Number(document.querySelector("#scu")?.value) || 0;
  const goal = Number(document.querySelector("#goal")?.value) || 0;
  const out = document.querySelector("#trade-out");
  if (!out || !c) return;
  const m = (c.priceSell || 0) - (c.priceBuy || 0);
  const profit = m * scu;
  const trips = profit > 0 && goal > 0 ? Math.ceil(goal / profit) : "—";
  out.innerHTML = `
    <div class="grid-3">
      <div class="stat"><span>Achat / SCU</span><b>${fmt(c.priceBuy)}</b></div>
      <div class="stat"><span>Vente / SCU</span><b>${fmt(c.priceSell)}</b></div>
      <div class="stat"><span>Marge / SCU</span><b class="hi">${fmt(m)}</b></div>
      <div class="stat"><span>Profit trip</span><b class="hi">${fmt(profit)}</b></div>
      <div class="stat"><span>Trips objectif</span><b>${trips}</b></div>
    </div>
  `;
}

function renderCompareOut() {
  const a = state.ships.find((s) => s.id === document.querySelector("#ca")?.value);
  const b = state.ships.find((s) => s.id === document.querySelector("#cb")?.value);
  const out = document.querySelector("#compare-out");
  if (!out) return;
  if (!a && !b) {
    out.innerHTML = `<p class="muted">Choisis deux vaisseaux.</p>`;
    return;
  }
  const rows = [
    ["Prix", (s) => (typeof s?.priceAuec === "number" ? fmt(s.priceAuec) : "—")],
    ["Location / jour", (s) => (s?.rentDay ? fmt(s.rentDay) : "—")],
    ["Cargo", (s) => (s?.cargoScu ? `${s.cargoScu} SCU` : "—")],
    ["Crew", (s) => s?.crew || "—"],
    ["Taille", (s) => s?.size || "—"],
    ["Rôles", (s) => (s?.roles || []).join(", ") || "—"],
  ];
  out.innerHTML = `
    <table class="compare-table">
      <thead><tr><th></th><th>${a?.name || "—"}</th><th>${b?.name || "—"}</th></tr></thead>
      <tbody>
        ${rows
          .map(
            ([l, f]) =>
              `<tr><th>${l}</th><td>${f(a)}</td><td>${f(b)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bindPage() {
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.onclick = () => {
      state.page = btn.dataset.page;
      renderApp();
    };
  });

  if (state.page === "session") {
    document.querySelector("#refresh-game")?.addEventListener("click", async () => {
      await refreshGame();
      renderApp();
    });
    document.querySelector("#read-log")?.addEventListener("click", async () => {
      const tail = await window.hm.gameLogTail();
      if (tail.ok) state.events = tail.events || [];
      await refreshGame();
      renderApp();
    });
  }

  if (state.page === "hangar") {
    const input = document.querySelector("#hs");
    const box = document.querySelector("#hsuggest");
    input?.addEventListener("input", () => {
      const q = input.value.toLowerCase().trim();
      if (!q) {
        box.innerHTML = "";
        return;
      }
      const hits = state.ships
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 10);
      box.innerHTML = hits
        .map(
          (s) =>
            `<button type="button" data-add="${s.id}"><span>${s.name}</span><span>${
              state.hangar.includes(s.id) ? "OK" : "Ajouter"
            }</span></button>`
        )
        .join("");
    });
    box?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]");
      if (!b) return;
      if (!state.hangar.includes(b.dataset.add)) {
        state.hangar.push(b.dataset.add);
        saveHangar();
      }
      renderApp();
    });
    document.querySelector("#hlist")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rm]");
      if (!b) return;
      state.hangar = state.hangar.filter((id) => id !== b.dataset.rm);
      saveHangar();
      renderApp();
    });
  }

  if (state.page === "trade") {
    const syncScu = () => {
      const v = document.querySelector("#shipscu")?.value;
      if (v) document.querySelector("#scu").value = v;
      renderTradeOut();
    };
    ["commodity", "scu", "goal", "shipscu"].forEach((id) => {
      document.querySelector(`#${id}`)?.addEventListener("input", syncScu);
      document.querySelector(`#${id}`)?.addEventListener("change", syncScu);
    });
    renderTradeOut();
  }

  if (state.page === "compare") {
    document.querySelector("#ca")?.addEventListener("change", renderCompareOut);
    document.querySelector("#cb")?.addEventListener("change", renderCompareOut);
    renderCompareOut();
  }

  if (state.page === "notes") {
    document.querySelector("#save-notes")?.addEventListener("click", () => {
      localStorage.setItem(
        "hm-desktop-notes",
        document.querySelector("#notes").value
      );
    });
  }

  if (state.page === "account") {
    document.querySelector("#buy2")?.addEventListener("click", () => window.hm.openCheckout());
    document.querySelector("#site")?.addEventListener("click", () =>
      window.hm.openExternal("https://hangarmatch.org/app.html")
    );
    document.querySelector("#clear-lic")?.addEventListener("click", async () => {
      await window.hm.clearLicense();
      await refreshLicense();
      render();
    });
  }
}

function pageHtml() {
  switch (state.page) {
    case "hangar":
      return pageHangar();
    case "trade":
      return pageTrade();
    case "compare":
      return pageCompare();
    case "notes":
      return pageNotes();
    case "account":
      return pageAccount();
    default:
      return pageSession();
  }
}

function renderApp() {
  document.querySelector("#app").innerHTML = shell(pageHtml());
  bindPage();
}

function render() {
  if (!state.licensed) {
    renderGate();
    return;
  }
  renderApp();
}

async function boot() {
  await refreshLicense();
  if (state.licensed) {
    await Promise.all([refreshGame(), loadData().catch(() => {})]);
    // poll session
    setInterval(async () => {
      if (!state.licensed) return;
      const prev = state.game?.running;
      await refreshGame();
      if (state.page === "session" && prev !== state.game?.running) renderApp();
      if (state.game?.running) {
        const polled = await window.hm.gamePoll();
        if (polled.events?.length) {
          state.events = [...state.events, ...polled.events].slice(-80);
          if (state.page === "session") renderApp();
        }
      }
    }, 8000);
  }
  render();
}

boot();
