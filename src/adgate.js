/**
 * Détection de bloqueur de pubs + écran d'accès.
 * Bait avec des noms que EasyList / uBlock masquent habituellement.
 */

export function detectAdBlock() {
  // ne pas bloquer les robots Google (AdSense / Search)
  const ua = navigator.userAgent || "";
  if (/Googlebot|Mediapartners-Google|AdsBot-Google|Google-InspectionTool/i.test(ua)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const bait = document.createElement("div");
    bait.id = "ad-banner";
    bait.className =
      "adsbox ad-banner adsbygoogle pub_300x250 text-ad textAd banner-ad ad-unit ad-placement";
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

    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "1px";
    ins.style.height = "1px";
    bait.appendChild(ins);

    // laisser le temps aux filtres cosmétiques d'agir
    requestAnimationFrame(() => {
      setTimeout(() => {
        const cs = getComputedStyle(bait);
        const blocked =
          !document.body.contains(bait) ||
          bait.offsetHeight === 0 ||
          bait.clientHeight === 0 ||
          cs.display === "none" ||
          cs.visibility === "hidden" ||
          cs.opacity === "0" ||
          cs.height === "0px" ||
          cs.maxHeight === "0px";
        bait.remove();
        resolve(blocked);
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
