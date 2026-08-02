/** Remplace ces URLs quand ton produit Lemon Squeezy est créé. */
export const STORE = {
  /** Lien checkout Lemon Squeezy (produit + license key activée) */
  checkoutUrl: "https://hangarmatch.lemonsqueezy.com/buy/REPLACE_ME",
  /** Page produit / pricing sur le site */
  webAppUrl: "https://hangarmatch.org/app.html",
  productName: "Hangar Match Desktop",
  version: "1.0.0",
};

/** Endpoints publics Lemon Squeezy License API (pas de clé secrète requise) */
export const LEMON = {
  activate: "https://api.lemonsqueezy.com/v1/licenses/activate",
  validate: "https://api.lemonsqueezy.com/v1/licenses/validate",
  deactivate: "https://api.lemonsqueezy.com/v1/licenses/deactivate",
};

export const DATA = {
  shipsUrl: "https://hangarmatch.org/data/ships.json",
  commoditiesUrl: "https://hangarmatch.org/data/commodities.json",
};
