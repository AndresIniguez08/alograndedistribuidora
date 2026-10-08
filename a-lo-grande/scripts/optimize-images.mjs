// Genera los WebP responsivos de public/assets/img/ a partir de las fotos en images-src/.
// Uso: npm run images

import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "images-src");
const OUT_DIR = path.join(ROOT_DIR, "public", "assets", "img");

const QUALITY = 78;
const DEFAULT_WIDTHS = [800, 1200, 1600];
const HERO_WIDTHS = [1280, 1920, 2560];

function normalizeName(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orientationOf(width, height) {
  if (width > height) return "horizontal";
  if (width < height) return "vertical";
  return "cuadrada";
}

async function processImage(file) {
  const srcPath = path.join(SRC_DIR, file);
  const name = normalizeName(file);
  const isHero = name === "hero";
  const widths = isHero ? HERO_WIDTHS : DEFAULT_WIDTHS;

  const rotated = sharp(srcPath).rotate();
  const { width: naturalWidth, height: naturalHeight } = await rotated.metadata();
  const orientation = orientationOf(naturalWidth, naturalHeight);

  console.log(`\n${file} -> ${name} (original ${naturalWidth}x${naturalHeight}, ${orientation})`);

  for (const width of widths) {
    const outName = `${name}-${width}.webp`;
    const outPath = path.join(OUT_DIR, outName);

    await sharp(srcPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);

    const [{ size }, outMeta] = await Promise.all([stat(outPath), sharp(outPath).metadata()]);
    console.log(`  ${outName}  ${outMeta.width}x${outMeta.height}  ${(size / 1024).toFixed(1)} kB`);
  }
}

async function main() {
  let entries;
  try {
    entries = await readdir(SRC_DIR);
  } catch {
    console.log(`No existe ${SRC_DIR}. Nada para optimizar.`);
    return;
  }

  const images = entries.filter((file) => /\.(jpe?g|png)$/i.test(file));
  if (images.length === 0) {
    console.log(`No hay fotos en ${SRC_DIR}. Nada para optimizar.`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const file of images) {
    await processImage(file);
  }
}

main();
