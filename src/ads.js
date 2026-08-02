/**
 * Google AdSense — uniquement dans TES emplacements (.promo-frame).
 * Pas d’Auto ads page-level (sinon Google place où il veut).
 *
 * 1. Dans AdSense : désactive Auto ads (ou coupe overlays / in-page).
 * 2. Crée une unité Display responsive.
 * 3. Colle l’ID dans AD_SLOT (ou VITE_ADSENSE_SLOT dans .env).
 */

export const AD_CLIENT = "ca-pub-2598514579769865";

/** ID unité Display — AdSense → Annonces → Par unité publicitaire */
export const AD_SLOT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADSENSE_SLOT) ||
  "";

const FORMAT_BY_SLOT = {
  leaderboard: { format: "horizontal", minHeight: "90px" },
  footer: { format: "horizontal", minHeight: "90px" },
  "sky-left": { format: "vertical", minHeight: "600px" },
  "sky-right": { format: "vertical", minHeight: "600px" },
};

function formatFor(name) {
  if (name && String(name).startsWith("infeed")) {
    return { format: "rectangle", minHeight: "280px" };
  }
  return FORMAT_BY_SLOT[name] || { format: "auto", minHeight: "100px" };
}

function mountFrame(frame) {
  if (!frame || frame.dataset.adMounted === "1") return;
  frame.dataset.adMounted = "1";

  // Sans ID d’unité : placeholder visible, aucune pub “au hasard”
  if (!AD_SLOT) return;

  const name = frame.getAttribute("data-slot") || "auto";
  const { format, minHeight } = formatFor(name);
  const placeholder = frame.querySelector(".promo-placeholder");

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.style.minHeight = minHeight;
  ins.style.width = "100%";
  ins.setAttribute("data-ad-client", AD_CLIENT);
  ins.setAttribute("data-ad-slot", AD_SLOT);
  ins.setAttribute(
    "data-ad-format",
    format === "horizontal" || format === "vertical" || format === "rectangle"
      ? format
      : "auto"
  );
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
