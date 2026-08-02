/**
 * Google AdSense — pubs uniquement dans TES emplacements (.promo-frame).
 * Pas d’Auto ads page-level.
 */

export const AD_CLIENT = "ca-pub-2598514579769865";

/** ID par emplacement (data-slot sur le HTML) */
export const AD_SLOTS = {
  leaderboard: "7963958332", // aperçu haut
  footer: "6650876663", // aperçu bas
  "sky-left": "9485903504", // aperçu côté gauche
  "sky-right": "1398549982", // aperçu côté droit
  // carrés dans la liste (infeed) — même ID réutilisé
  infeed: "7937018118",
};

/** min-height de réserve (le format reste "auto" comme le snippet AdSense) */
const MIN_H_BY_SLOT = {
  leaderboard: "90px",
  footer: "90px",
  "sky-left": "600px",
  "sky-right": "600px",
};

function slotIdFor(name) {
  if (AD_SLOTS[name]) return AD_SLOTS[name];
  if (name && String(name).startsWith("infeed")) {
    return AD_SLOTS.infeed || "";
  }
  return "";
}

function minHeightFor(name) {
  if (name && String(name).startsWith("infeed")) return "250px";
  return MIN_H_BY_SLOT[name] || "90px";
}

function pushAd(ins) {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* ignore */
  }
}

function whenAdsReady(cb) {
  if (window.adsbygoogle && !Array.isArray(window.adsbygoogle)) {
    cb();
    return;
  }
  const existing = document.querySelector('script[src*="adsbygoogle.js"]');
  if (!existing) {
    cb();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  existing.addEventListener("load", run, { once: true });
  // déjà chargé / cache
  if (existing.dataset.loaded === "1" || existing.getAttribute("data-nscript")) {
    run();
  }
  // filet de sécurité
  setTimeout(run, 2500);
}

function mountFrame(frame) {
  if (!frame || frame.dataset.adMounted === "1") return;

  const name = frame.getAttribute("data-slot") || "";
  const slotId = slotIdFor(name);
  if (!slotId) return;

  frame.dataset.adMounted = "1";

  const placeholder = frame.querySelector(".promo-placeholder");

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.style.minHeight = minHeightFor(name);
  ins.style.width = "100%";
  ins.setAttribute("data-ad-client", AD_CLIENT);
  ins.setAttribute("data-ad-slot", slotId);
  // même attributs que « Obtenir le code » AdSense
  ins.setAttribute("data-ad-format", "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  frame.appendChild(ins);
  frame.classList.add("promo-frame--live");

  whenAdsReady(() => pushAd(ins));

  const reveal = () => {
    const status = ins.getAttribute("data-ad-status");
    const iframe = frame.querySelector("iframe");
    if (status === "filled" || (iframe && iframe.offsetHeight > 20)) {
      placeholder?.remove();
      frame.classList.add("promo-frame--filled");
      return true;
    }
    if (status === "unfilled") {
      // Google a répondu « pas de pub » — garder le placeholder
      return true;
    }
    return false;
  };

  const mo = new MutationObserver(() => {
    if (reveal()) mo.disconnect();
  });
  mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
  mo.observe(frame, { childList: true, subtree: true });
  setTimeout(() => {
    reveal();
    mo.disconnect();
  }, 8000);
}

export function mountAds(root = document) {
  root.querySelectorAll(".promo-frame[data-slot]").forEach(mountFrame);
}
