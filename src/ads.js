/**
 * Google AdSense
 * - Auto ads page-level (pas de cadres vides)
 * - Unités display dans .promo-frame seulement si AD_SLOT est défini
 *   et seulement si Google remplit vraiment l’annonce
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

function wrapOf(frame) {
  return frame.closest(".promo-slot, .promo-rail") || frame;
}

function hideWrap(frame) {
  const wrap = wrapOf(frame);
  wrap.hidden = true;
  wrap.setAttribute("aria-hidden", "true");
  wrap.classList.add("promo-empty");
}

function showWrap(frame) {
  const wrap = wrapOf(frame);
  wrap.hidden = false;
  wrap.removeAttribute("aria-hidden");
  wrap.classList.remove("promo-empty");
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

function watchFill(frame, ins) {
  const done = (ok) => {
    if (ok) showWrap(frame);
    else hideWrap(frame);
  };

  // AdSense pose data-ad-status="filled" | "unfilled"
  const check = () => {
    const status = ins.getAttribute("data-ad-status");
    if (status === "filled") {
      done(true);
      return true;
    }
    if (status === "unfilled") {
      done(false);
      return true;
    }
    // iframe présent avec taille réelle
    const iframe = frame.querySelector("iframe");
    if (iframe && iframe.offsetHeight > 20) {
      done(true);
      return true;
    }
    return false;
  };

  if (check()) return;

  const mo = new MutationObserver(() => {
    if (check()) mo.disconnect();
  });
  mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
  mo.observe(frame, { childList: true, subtree: true });

  // timeout : pas de pub → on cache le rectangle blanc
  setTimeout(() => {
    mo.disconnect();
    if (!check()) done(false);
  }, 4000);
}

function mountFrame(frame) {
  if (!frame || frame.dataset.adMounted === "1") return;
  frame.dataset.adMounted = "1";

  // Sans ID d’unité : on cache les cadres (Auto ads page-level suffit)
  if (!AD_SLOT) {
    hideWrap(frame);
    return;
  }

  const name = frame.getAttribute("data-slot") || "auto";
  const { format, minHeight } = formatFor(name);

  frame.querySelector(".promo-placeholder")?.remove();
  frame.classList.add("promo-frame--live");
  // caché jusqu’à ce qu’une vraie pub arrive
  hideWrap(frame);

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

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    hideWrap(frame);
    return;
  }

  watchFill(frame, ins);
}

export function mountAds(root = document) {
  ensurePageLevelAds();
  root.querySelectorAll(".promo-frame[data-slot]").forEach(mountFrame);
}
