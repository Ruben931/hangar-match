/**
 * Détection de bloqueur de pubs + écran d'accès.
 * Bait EasyList / uBlock + requête vers le CDN AdSense.
 */

import { t } from "./i18n.js";

export function detectAdBlock() {
  // ne pas bloquer les robots Google (AdSense / Search)
  const ua = navigator.userAgent || "";
  if (/Googlebot|Mediapartners-Google|AdsBot-Google|Google-InspectionTool/i.test(ua)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    // pas de faux <ins class="adsbygoogle"> : Google le verrait comme une unité invalide
    const bait = document.createElement("div");
    bait.id = "ad-banner";
    bait.className =
      "adsbox ad-banner pub_300x250 text-ad textAd banner-ad ad-unit ad-placement";
    bait.setAttribute("aria-hidden", "true");
    bait.innerHTML = "&nbsp;";
    Object.assign(bait.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "1px",
      height: "1px",
      pointerEvents: "none",
      zIndex: "-1",
    });
    document.body.appendChild(bait);

    let networkBlocked = false;
    const netProbe = fetch(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      { method: "HEAD", mode: "no-cors", cache: "no-store" }
    )
      .then(() => {
        /* opaque ok = réseau pas coupé */
      })
      .catch(() => {
        networkBlocked = true;
      });

    const finish = () => {
      const cs = getComputedStyle(bait);
      const baitBlocked =
        !document.body.contains(bait) ||
        bait.offsetHeight === 0 ||
        bait.clientHeight === 0 ||
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        cs.opacity === "0" ||
        cs.height === "0px" ||
        cs.maxHeight === "0px";
      bait.remove();
      resolve(baitBlocked || networkBlocked);
    };

    requestAnimationFrame(() => {
      setTimeout(() => {
        Promise.race([
          netProbe,
          new Promise((r) => setTimeout(r, 400)),
        ]).then(finish);
      }, 120);
    });
  });
}

export function mountGate({ title, body, retry, onRetry }) {
  let el = document.querySelector("#access-gate");
  if (!el) {
    el = document.createElement("div");
    el.id = "access-gate";
    el.className = "access-gate";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="access-gate-card">
        <p class="access-gate-stamp">Hangar Match</p>
        <h2 class="access-gate-title"></h2>
        <p class="access-gate-body"></p>
        <button type="button" class="access-gate-btn"></button>
      </div>`;
    document.body.appendChild(el);
  }

  el.querySelector(".access-gate-title").textContent = title;
  el.querySelector(".access-gate-body").textContent = body;
  const btn = el.querySelector(".access-gate-btn");
  btn.textContent = retry;
  btn.onclick = onRetry;
  el.hidden = false;
  document.documentElement.classList.add("gate-locked");
  return el;
}

export function hideGate() {
  const el = document.querySelector("#access-gate");
  if (el) el.hidden = true;
  document.documentElement.classList.remove("gate-locked");
}

/** Active le mur si un bloqueur est détecté. */
export async function enforceAdGate() {
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

/** À appeler depuis init + visibilitychange */
export function watchAdGate() {
  enforceAdGate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") enforceAdGate();
  });
}
