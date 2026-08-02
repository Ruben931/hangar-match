/**
 * Réduit le bandeau teaser sticky au scroll.
 */
export function initTeaserCompact(threshold = 48) {
  const el =
    document.querySelector(".app-teaser--sticky") ||
    document.querySelector("#app-teaser") ||
    document.querySelector("#app-teaser-top");
  if (!el) return;

  let ticking = false;
  const sync = () => {
    ticking = false;
    const compact = window.scrollY > threshold;
    el.classList.toggle("app-teaser--compact", compact);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sync);
  };

  sync();
  window.addEventListener("scroll", onScroll, { passive: true });
}
