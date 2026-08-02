/**
 * Google AdSense — Auto ads page-level + unités dans les .promo-frame
 * Client : ca-pub-2598514579769865
 *
 * Optionnel : VITE_ADSENSE_SLOT=ton_id_unite dans .env
 * (AdSense → Annonces → Par unité → Display responsive)
 */

export const AD_CLIENT = "ca-pub-2598514579769865";

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

  const name = frame.getAttribute("data-slot") || "auto";
  const { format, minHeight } = formatFor(name);

  frame.querySelector(".promo-placeholder")?.remove();
  frame.classList.add("promo-frame--live");

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.style.minHeight = minHeight;
  ins.style.width = "100%";
  ins.setAttribute("data-ad-client", AD_CLIENT);
  if (AD_SLOT) ins.setAttribute("data-ad-slot", AD_SLOT);
  ins.setAttribute(
    "data-ad-format",
    format === "horizontal" || format === "vertical" || format === "rectangle"
      ? format
      : "auto"
  );
  ins.setAttribute("data-full-width-responsive", "true");
  frame.appendChild(ins);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* ignore */
  }
}

export function mountAds(root = document) {
  ensurePageLevelAds();
  root.querySelectorAll(".promo-frame[data-slot]").forEach(mountFrame);
}
