/**
 * Trims the transparent padding from public/logo.png into public/logo-mark.png.
 * The supplied artwork is 2600x2000 with most of the canvas empty, which makes
 * the mark render tiny inside a fixed-height header slot.
 *
 * Run after replacing logo.png:  node scripts/trim-logo.mjs
 * Then update `logoWidth`/`logoHeight` in src/lib/site.ts with the printed size.
 */
import sharp from "sharp";

const SOURCE = "public/logo.png";
const TARGET = "public/logo-mark.png";

const original = await sharp(SOURCE).metadata();
const { data, info } = await sharp(SOURCE)
  .trim({ threshold: 12 })
  .toBuffer({ resolveWithObject: true });

await sharp(data).png({ compressionLevel: 9 }).toFile(TARGET);

console.log(`${SOURCE}  ${original.width}x${original.height}`);
console.log(`${TARGET}  ${info.width}x${info.height}`);
console.log(`\nSet in src/lib/site.ts:  logoWidth: ${info.width}, logoHeight: ${info.height}`);
