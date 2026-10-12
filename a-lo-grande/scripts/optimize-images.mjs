// Genera los WebP responsivos de public/assets/img/ a partir de las fotos en images-src/.
// Uso: npm run images
// Cada archivo lleva un hash del contenido en el nombre (<nombre>-<ancho>.<hash>.webp): /assets/img/*.webp
// se sirve como immutable, así que un cambio de foto tiene que cambiar la URL. El script borra la versión
// anterior y actualiza las referencias en index.html y styles.css.

import { createHash } from "node:crypto";
import { readdir, mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "images-src");
const OUT_DIR = path.join(ROOT_DIR, "public", "assets", "img");
const REF_FILES = [
  path.join(ROOT_DIR, "public", "index.html"),
  path.join(ROOT_DIR, "public", "css", "styles.css"),
];

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

// <nombre>-<ancho>.webp, con o sin hash (los nombres normalizados solo tienen [a-z0-9-])
function variantPattern(base, flags = "") {
  return new RegExp(`${base}(?:\\.[0-9a-f]{8})?\\.webp`, flags);
}

async function processImage(file, existing) {
  const srcPath = path.join(SRC_DIR, file);
  const name = normalizeName(file);
  const isHero = name === "hero";
  const widths = isHero ? HERO_WIDTHS : DEFAULT_WIDTHS;

  const rotated = sharp(srcPath).rotate();
  const { width: naturalWidth, height: naturalHeight } = await rotated.metadata();
  const orientation = orientationOf(naturalWidth, naturalHeight);

  console.log(`\n${file} -> ${name} (original ${naturalWidth}x${naturalHeight}, ${orientation})`);

  const renames = [];
  for (const width of widths) {
    const base = `${name}-${width}`;
    const buffer = await sharp(srcPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 8);
    const outName = `${base}.${hash}.webp`;

    // Borra las versiones anteriores de este tamaño (con otro hash o sin hash)
    const oldPattern = new RegExp(`^${variantPattern(base).source}$`);
    for (const old of existing.filter((f) => oldPattern.test(f) && f !== outName)) {
      await unlink(path.join(OUT_DIR, old));
    }
    await writeFile(path.join(OUT_DIR, outName), buffer);
    renames.push({ base, outName });

    const outMeta = await sharp(buffer).metadata();
    console.log(`  ${outName}  ${outMeta.width}x${outMeta.height}  ${(buffer.length / 1024).toFixed(1)} kB`);
  }
  return renames;
}

// Apunta las referencias a los nombres nuevos. Usa strings tal cual para respetar los finales de línea.
async function updateRefs(renames) {
  for (const refFile of REF_FILES) {
    const text = await readFile(refFile, "utf8");
    let updated = text;
    for (const { base, outName } of renames) {
      updated = updated.replace(variantPattern(`assets/img/${base}`, "g"), `assets/img/${outName}`);
    }
    if (updated !== text) {
      await writeFile(refFile, updated, "utf8");
      console.log(`\nReferencias actualizadas en ${path.relative(ROOT_DIR, refFile)}`);
    }
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
  const existing = await readdir(OUT_DIR);

  const renames = [];
  for (const file of images) {
    renames.push(...(await processImage(file, existing)));
  }
  await updateRefs(renames);
}

main();
