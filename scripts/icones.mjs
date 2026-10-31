// Génère les icônes PNG « cœur néon » à partir de public/brand/icone-coeur-neon.svg.
// Usage : node scripts/icones.mjs (sharp est fourni par Next.js)
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const arrondi = await readFile(new URL("../public/brand/icone-coeur-neon.svg", import.meta.url), "utf8");
// Version carrée : l'iPhone arrondit lui-même les coins ; zone de sécurité Android (maskable)
const carre = arrondi.replaceAll(' rx="230"', "");

const sorties = [
  [carre, "public/icons/apple-icon-neon.png", 180],
  [carre, "public/icons/neon-maskable-512.png", 512],
  [arrondi, "public/icons/neon-192.png", 192],
  [arrondi, "public/icons/neon-512.png", 512],
  [arrondi, "src/app/icon.png", 64],
];

for (const [svg, nom, taille] of sorties) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(taille, taille)
    .png()
    .toFile(new URL(`../${nom}`, import.meta.url).pathname);
  console.log(`${nom} (${taille}×${taille})`);
}
