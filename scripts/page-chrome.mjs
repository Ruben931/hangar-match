/**
 * Blocs HTML partagés : teaser + rails pubs + footer pub
 * (mêmes data-slot / IDs AdSense que l’accueil)
 */
export const TEASER_HTML = `
    <a class="app-teaser app-teaser--sticky" href="/app.html" id="app-teaser">
      <span class="app-teaser-stamp" id="app-teaser-stamp">Bientôt</span>
      <span class="app-teaser-body">
        <strong id="app-teaser-title">Hangar Match Desktop</strong>
        <span id="app-teaser-text">App Windows — pont avec le jeu · hangar · trade. En approche.</span>
      </span>
      <span class="app-teaser-cta" id="app-teaser-cta">Découvrir →</span>
    </a>`;

export const AD_RAILS_HTML = `
    <aside class="promo-rail promo-rail--left" aria-label="Espace publicitaire">
      <span class="promo-label">Publicité</span>
      <div class="promo-frame promo-frame--sky" data-slot="sky-left">
        <span class="promo-placeholder">160 × 600<br />skyscraper</span>
      </div>
    </aside>
    <aside class="promo-rail promo-rail--right" aria-label="Espace publicitaire">
      <span class="promo-label">Publicité</span>
      <div class="promo-frame promo-frame--sky" data-slot="sky-right">
        <span class="promo-placeholder">160 × 600<br />skyscraper</span>
      </div>
    </aside>`;

export const AD_LEADER_HTML = `
      <aside class="promo-slot promo-slot--leader" aria-label="Espace publicitaire">
        <span class="promo-label">Publicité</span>
        <div class="promo-frame promo-frame--leader" data-slot="leaderboard">
          <span class="promo-placeholder">728 × 90 — bandeau</span>
        </div>
      </aside>`;

export const AD_FOOTER_HTML = `
      <aside class="promo-slot promo-slot--footer" aria-label="Espace publicitaire">
        <span class="promo-label">Publicité</span>
        <div class="promo-frame promo-frame--leader" data-slot="footer">
          <span class="promo-placeholder">728 × 90 — bandeau bas</span>
        </div>
      </aside>`;
