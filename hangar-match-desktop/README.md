# Hangar Match Desktop

App Windows (Electron) payante via **Lemon Squeezy**.

## Ce que fait la « connexion au jeu »

- Détecte `StarCitizen.exe` / launcher RSI
- Lit le `Game.log` local (événements zone / session / combat approximatifs)
- **Ne fait pas** : lecture mémoire, injection, bots, API serveur CIG

## Dev rapide

```bash
cd hangar-match-desktop
set HM_DEV=1
npm start
```

Ou active avec la clé `DEV-LOCAL`.

## Paiement (Lemon Squeezy)

1. Crée un compte [Lemon Squeezy](https://lemonsqueezy.com)
2. Produit digital → active **License keys**
3. Copie l’URL checkout dans `src/config.js` → `STORE.checkoutUrl`
4. Même URL dans `app.html` (bouton Acheter)
5. Après achat, le client reçoit une clé → **Activer** dans l’app

## Build installateur Windows

```bash
cd hangar-match-desktop
npm run make
```

Sortie dans `hangar-match-desktop/out/`.

## Données

L’app charge `ships.json` et `commodities.json` depuis https://hangarmatch.org
