/**
 * Catégories "meilleurs vaisseaux" — une page SEO par rôle.
 * `slug` = URL /meilleurs-vaisseaux/{slug}.html
 */

import { CAT_I18N } from "./category-i18n.js";

export const CATEGORIES = [
  {
    id: "cargo",
    role: "cargo",
    slug: "cargo",
    title: {
      fr: "Meilleur vaisseau cargo Star Citizen",
      en: "Best Star Citizen cargo ship",
    },
    description: {
      fr: "Classement des meilleurs vaisseaux cargo Star Citizen selon le prix aUEC, la soute (SCU) et la dispo in-game. Compare et affine avec ton budget.",
      en: "Best Star Citizen cargo ships ranked by aUEC price, SCU cargo and in-game availability. Compare and refine with your budget.",
    },
    intro: {
      fr: "Tu veux transporter de la marchandise sans te ruiner ? Voici les cargos qui sortent du lot : bon volume de soute, prix aUEC connus, et disponibles chez les revendeurs (New Deal, Astro Armada…). Affiné ensuite avec le comparateur selon ton budget et ta position.",
      en: "Need to haul cargo without burning your wallet? These freighters stand out for SCU capacity, known aUEC prices, and dealer availability. Then refine with the comparator using your budget and location.",
    },
  },
  {
    id: "combat",
    role: "combat",
    slug: "combat",
    title: {
      fr: "Meilleur vaisseau de combat Star Citizen",
      en: "Best Star Citizen combat ship",
    },
    description: {
      fr: "Les meilleurs chasseurs et vaisseaux de combat Star Citizen : rapport prix aUEC / efficacité, du starter au medium fighter.",
      en: "Best Star Citizen fighters and combat ships: aUEC value from starter dogfighters to medium fighters.",
    },
    intro: {
      fr: "Du light fighter au gunship, ces appareils sont taillés pour le combat. On privilégie le flight-ready et l'achat in-game quand c'est possible, pour que tu puisses monter en puissance sans passer uniquement par le pledge store.",
      en: "From light fighters to gunships, these ships are built to fight. We favour flight-ready hulls and in-game purchases when available so you can power up without pledge-only options.",
    },
  },
  {
    id: "mining",
    role: "mining",
    slug: "mining",
    title: {
      fr: "Meilleur vaisseau mining Star Citizen",
      en: "Best Star Citizen mining ship",
    },
    description: {
      fr: "Meilleurs vaisseaux de mining Star Citizen : Prospect, MOLE et alternatives selon budget aUEC.",
      en: "Best Star Citizen mining ships — Prospect, MOLE and alternatives by aUEC budget.",
    },
    intro: {
      fr: "Pour casser de la roche et remplir les caisses, le bon mineur compte autant que le spot. Voici les références mining classées pour t'aider à choisir selon ton budget.",
      en: "The right miner matters as much as the rock. Here are the go-to mining ships ranked to help you pick by budget.",
    },
  },
  {
    id: "exploration",
    role: "exploration",
    slug: "exploration",
    title: {
      fr: "Meilleur vaisseau d'exploration Star Citizen",
      en: "Best Star Citizen exploration ship",
    },
    description: {
      fr: "Meilleurs vaisseaux d'exploration Star Citizen pour voyager, scanner et tenir la distance.",
      en: "Best Star Citizen exploration ships for travel, scanning and long-range runs.",
    },
    intro: {
      fr: "Explorer Stanton, Pyro ou Nyx demande de l'autonomie et du confort. Ces vaisseaux privilégient l'exploration et les longs trajets.",
      en: "Exploring Stanton, Pyro or Nyx needs range and comfort. These ships prioritise exploration and long hauls.",
    },
  },
  {
    id: "starter",
    role: "starter",
    slug: "debutant",
    title: {
      fr: "Meilleur vaisseau débutant Star Citizen",
      en: "Best Star Citizen starter ship",
    },
    description: {
      fr: "Meilleurs starters Star Citizen à acheter en aUEC : économiques, polyvalents, idéaux pour commencer.",
      en: "Best Star Citizen starter ships to buy in aUEC — cheap, versatile, ideal for beginners.",
    },
    intro: {
      fr: "Tu débutes et tu veux un premier appareil propre sans exploser ton compte aUEC ? Voici les starters les plus pertinents à viser en jeu.",
      en: "New to the 'verse and want a clean first ship without emptying your aUEC? These are the starters worth aiming for in-game.",
    },
  },
  {
    id: "salvage",
    role: "salvage",
    slug: "salvage",
    title: {
      fr: "Meilleur vaisseau salvage Star Citizen",
      en: "Best Star Citizen salvage ship",
    },
    description: {
      fr: "Meilleurs vaisseaux de salvage Star Citizen pour recycler et faire du profit sur les épaves.",
      en: "Best Star Citizen salvage ships for scraping wrecks and turning scrap into profit.",
    },
    intro: {
      fr: "Le salvage paie si tu as le bon outil. Voici les vaisseaux faits pour découper et récupérer les matériaux.",
      en: "Salvage pays when you have the right tool. These ships are built to cut and reclaim materials.",
    },
  },
  {
    id: "medical",
    role: "medical",
    slug: "medical",
    title: {
      fr: "Meilleur vaisseau médical Star Citizen",
      en: "Best Star Citizen medical ship",
    },
    description: {
      fr: "Meilleurs vaisseaux médicaux Star Citizen pour soigner, transporter et respawn en campagne.",
      en: "Best Star Citizen medical ships for healing, transport and field respawn.",
    },
    intro: {
      fr: "Beds médicaux, évacuation, soutien d'escouade : ces appareils sont pensés pour garder ton équipe en vie.",
      en: "Med beds, evac, squad support — these hulls are built to keep your crew alive.",
    },
  },
  {
    id: "racing",
    role: "racing",
    slug: "racing",
    title: {
      fr: "Meilleur vaisseau de course Star Citizen",
      en: "Best Star Citizen racing ship",
    },
    description: {
      fr: "Meilleurs racers Star Citizen pour la vitesse pure et les circuits.",
      en: "Best Star Citizen racers for raw speed and circuit runs.",
    },
    intro: {
      fr: "Léger, nerveux, taillé pour le chrono. Les meilleurs choix racing du registre.",
      en: "Light, twitchy, built for lap times. The best racing picks in the registry.",
    },
  },
  {
    id: "bounty",
    role: "bounty",
    slug: "bounty",
    title: {
      fr: "Meilleur vaisseau bounty Star Citizen",
      en: "Best Star Citizen bounty hunting ship",
    },
    description: {
      fr: "Meilleurs vaisseaux pour le bounty hunting Star Citizen : chasseurs efficaces selon budget aUEC.",
      en: "Best bounty hunting ships in Star Citizen — effective fighters by aUEC budget.",
    },
    intro: {
      fr: "Pour enchaîner les contrats de chasse à la prime, il faut un chasseur fiable. Voici les options qui collent le mieux.",
      en: "To chain bounty contracts you need a reliable fighter. These options fit best.",
    },
  },
  {
    id: "trading",
    role: "trading",
    slug: "trading",
    title: {
      fr: "Meilleur vaisseau trading Star Citizen",
      en: "Best Star Citizen trading ship",
    },
    description: {
      fr: "Meilleurs vaisseaux de trading Star Citizen pour le commerce et les routes rentables.",
      en: "Best Star Citizen trading ships for commerce and profitable routes.",
    },
    intro: {
      fr: "Acheter bas, vendre haut : ces vaisseaux aident à faire tourner la marchandise sur les bonnes routes.",
      en: "Buy low, sell high — these ships help move goods on the right routes.",
    },
  },
  {
    id: "multipurpose",
    role: "multipurpose",
    slug: "polyvalent",
    title: {
      fr: "Meilleur vaisseau polyvalent Star Citizen",
      en: "Best Star Citizen multipurpose ship",
    },
    description: {
      fr: "Meilleurs vaisseaux polyvalents Star Citizen : un seul appareil pour plusieurs activités.",
      en: "Best Star Citizen multipurpose ships — one hull for many jobs.",
    },
    intro: {
      fr: "Tu ne veux pas spécialiser tout de suite ? Les polyvalents couvrent cargo léger, combat occasionnel et déplacements.",
      en: "Not ready to specialise? Multipurpose ships cover light cargo, casual combat and travel.",
    },
  },
  {
    id: "luxury",
    role: "luxury",
    slug: "luxe",
    title: {
      fr: "Meilleur vaisseau de luxe Star Citizen",
      en: "Best Star Citizen luxury ship",
    },
    description: {
      fr: "Meilleurs vaisseaux de luxe Star Citizen : confort, standing et voyage VIP.",
      en: "Best Star Citizen luxury ships — comfort, status and VIP travel.",
    },
    intro: {
      fr: "Pour voyager avec style. Les appareils luxe du registre, quand le confort prime sur la soute brute.",
      en: "Travel in style. Luxury picks from the registry when comfort beats raw cargo.",
    },
  },
];

export function categoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export function categoryByRole(role) {
  return CATEGORIES.find((c) => c.role === role) || null;
}

export function catText(cat, field, lang) {
  const extra = CAT_I18N[cat.role]?.[field];
  if (extra?.[lang]) return extra[lang];
  const block = cat[field];
  if (!block) return "";
  return block[lang] || block.en || block.fr || "";
}
