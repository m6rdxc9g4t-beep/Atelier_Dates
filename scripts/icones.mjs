// Génère les icônes PNG de l'app (icône Atelier : cœur blanc sur carré rouge) à partir de public/brand/icone-atelier-dates.svg.
// Usage : node scripts/icones.mjs (sharp est fourni par Next.js)
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const arrondi = await readFile(new URL("../public/brand/icone-atelier-dates.svg", import.meta.url), "utf8");
// Version carrée, plein cadre : l'iPhone arrondit lui-même les coins ; zone de sécurité Android (maskable)
// (sans le relief du bord, qui laisserait un filet sombre une fois recadré)
const carre = arrondi
  .replaceAll(' rx="112"', "")
  .replace(/\s*<rect x="1"[^>]*\/>/, "")
  .replace(/\s*<path d="M112 3[^>]*\/>/, "");

const sorties = [
  [carre, "public/icons/apple-icon-neon.png", 180],
  [carre, "public/icons/neon-maskable-512.png", 512],
  [arrondi, "public/icons/neon-192.png", 192],
  [arrondi, "public/icons/neon-512.png", 512],
  // Notifications push (public/sw.js)
  [arrondi, "public/icons/icon-192.png", 192],
  [arrondi, "public/icons/icon-512.png", 512],
  [carre, "public/icons/icon-maskable-512.png", 512],
  // Favicon
  [arrondi, "src/app/icon.png", 64],
];

for (const [svg, nom, taille] of sorties) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(taille, taille)
    .png()
    .toFile(new URL(`../${nom}`, import.meta.url).pathname);
  console.log(`${nom} (${taille}×${taille})`);
}
