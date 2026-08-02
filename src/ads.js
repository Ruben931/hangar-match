/**
 * Google AdSense — pubs uniquement dans TES emplacements (.promo-frame).
 * Pas d’Auto ads page-level.
 *
 * Ajoute d’autres IDs quand tu crées des unités (bas, côtés, feed…).
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

const FORMAT_BY_SLOT = {
  leaderboard: { format: "auto", minHeight: "90px" },
  footer: { format: "auto", minHeight: "90px" },
  "sky-left": { format: "vertical", minHeight: "600px" },
  "sky-right": { format: "vertical", minHeight: "600px" },
};

function slotIdFor(name) {
  if (AD_SLOTS[name]) return AD_SLOTS[name];
  if (name && String(name).startsWith("infeed")) {
    return AD_SLOTS.infeed || AD_SLOTS.feed || "";
  }
  return "";
}

function formatFor(name) {
  if (name && String(name).startsWith("infeed")) {
    return { format: "rectangle", minHeight: "280px" };
  }
  return FORMAT_BY_SLOT[name] || { format: "auto", minHeight: "100px" };
}

function mountFrame(frame) {
  if (!frame || frame.dataset.adMounted === "1") return;

  const name = frame.getAttribute("data-slot") || "";
  const slotId = slotIdFor(name);
  if (!slotId) return;

  frame.dataset.adMounted = "1";

  const { format, minHeight } = formatFor(name);
  const placeholder = frame.querySelector(".promo-placeholder");

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.style.minHeight = minHeight;
  ins.style.width = "100%";
  ins.setAttribute("data-ad-client", AD_CLIENT);
  ins.setAttribute("data-ad-slot", slotId);
  ins.setAttribute("data-ad-format", format);
  ins.setAttribute("data-full-width-responsive", "true");
  frame.appendChild(ins);
  frame.classList.add("promo-frame--live");

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    return;
  }

  const reveal = () => {
    const status = ins.getAttribute("data-ad-status");
    const iframe = frame.querySelector("iframe");
    if (status === "filled" || (iframe && iframe.offsetHeight > 20)) {
      placeholder?.remove();
    }
  };

  const mo = new MutationObserver(reveal);
  mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
  mo.observe(frame, { childList: true, subtree: true });
  setTimeout(() => {
    reveal();
    mo.disconnect();
  }, 5000);
}

export function mountAds(root = document) {
  root.querySelectorAll(".promo-frame[data-slot]").forEach(mountFrame);
}
