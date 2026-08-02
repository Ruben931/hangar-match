/**
 * Google AdSense — pubs dans les cadres + Auto ads page-level.
 *
 * Pour que les cadres se remplissent : crée une unité Display responsive
 * dans AdSense, puis mets l’ID dans .env → VITE_ADSENSE_SLOT=xxxxxxxxx
 * (ou colle-le directement dans AD_SLOT ci-dessous).
 */

export const AD_CLIENT = "ca-pub-2598514579769865";

/** ID d’unité Display (AdSense → Annonces → Par unité publicitaire) */
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

function ensurePageLevelAds() {
  window.adsbygoogle = window.adsbygoogle || [];
  if (window.__hmPageAds) return;
  window.__hmPageAds = true;
  try {
    window.adsbygoogle.push({
      google_ad_client: AD_CLIENT,
      enable_page_level_ads: true,
      overlays: { bottom: true },
    });
  } catch {
    /* ignore */
  }
}

function mountFrame(frame) {
  if (!frame || frame.dataset.adMounted === "1") return;
  frame.dataset.adMounted = "1";

  const wrap = frame.closest(".promo-slot, .promo-rail") || frame;
  wrap.hidden = false;
  wrap.removeAttribute("aria-hidden");
  wrap.classList.remove("promo-empty");

  // Sans ID d’unité : on garde le placeholder (pas de rectangle blanc vide)
  // Les Auto ads page-level s’occupent d’afficher des pubs ailleurs sur la page.
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
    const filled =
      status === "filled" || (iframe && iframe.offsetHeight > 20);
    if (filled && placeholder) placeholder.remove();
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
  ensurePageLevelAds();
  root.querySelectorAll(".promo-frame[data-slot]").forEach(mountFrame);
}
