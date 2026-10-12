// Genera el video de fondo de la portada y su póster a partir del original en images-src/.
// Uso: npm run video
// Necesita ffmpeg: usa el de ffmpeg-static (devDependency) o, si no está, el del sistema (PATH).
//
// Salidas (nombres versionados: /assets/* se sirve con caché largo, así que si el video cambia
// hay que subir VERSION y actualizar las referencias en index.html; ver docs/IMAGENES.md):
//   public/assets/video/hero-camion-<VERSION>.webm   VP9, sin audio
//   public/assets/video/hero-camion-<VERSION>.mp4    H.264, sin audio, +faststart
//   public/assets/img/hero-camion-poster-<VERSION>.webp      último fotograma (logo del semi)
//   public/assets/img/hero-camion-poster-<VERSION>-800.webp  ídem, para móvil

import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const VERSION = "v1";
const SOURCE_NAME = /^camion con logo\.[a-z0-9]+$/i; // original en images-src/ (cualquier extensión)
const WIDTH = 1280; // ancho del original: no se agranda
const FPS = 30;
const POSTER_WIDTHS = [1280, 800];
const POSTER_QUALITY = 80;
const MAX_BYTES = 4 * 1024 * 1024; // objetivo; Cloudflare Pages no acepta archivos de más de 25 MiB

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "images-src");
const VIDEO_DIR = path.join(ROOT, "public", "assets", "video");
const IMG_DIR = path.join(ROOT, "public", "assets", "img");

function ffmpegPath() {
  try {
    return createRequire(import.meta.url)("ffmpeg-static");
  } catch {
    return "ffmpeg";
  }
}
const FFMPEG = ffmpegPath();

function run(args) {
  const result = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8",
  });
  if (result.error) {
    console.error(`No se pudo ejecutar ffmpeg (${FFMPEG}). Instalá ffmpeg-static (npm i -D ffmpeg-static) o ffmpeg en el sistema.`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(1);
  }
}

function durationOf(file) {
  const { stderr } = spawnSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr || "");
  return match ? +match[1] * 3600 + +match[2] * 60 + +match[3] : NaN;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const sourceFile = (await readdir(SRC_DIR)).find((file) => SOURCE_NAME.test(file));
if (!sourceFile) {
  console.error(`No encontré "camion con logo.*" en ${SRC_DIR}`);
  process.exit(1);
}
const source = path.join(SRC_DIR, sourceFile);
await mkdir(VIDEO_DIR, { recursive: true });

const base = `hero-camion-${VERSION}`;
const filters = `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`;
const mp4 = path.join(VIDEO_DIR, `${base}.mp4`);
const webm = path.join(VIDEO_DIR, `${base}.webm`);

console.log(`Original: ${sourceFile} (${durationOf(source).toFixed(2)} s). Sin recorte: hay movimiento de punta a punta.`);

// H.264 para Safari y navegadores sin VP9
run(["-i", source, "-an", "-vf", filters, "-c:v", "libx264", "-preset", "slow", "-crf", "27",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);

// VP9 (más liviano; se ofrece primero). Calidad constante: -b:v 0 con -crf.
run(["-i", source, "-an", "-vf", filters, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36",
  "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", webm]);

// Póster: el último fotograma (el video termina congelado ahí, así no hay salto)
const lastFrame = path.join(os.tmpdir(), `${base}-ultimo.png`);
run(["-sseof", "-0.5", "-i", source, "-vf", `scale=${WIDTH}:-2:flags=lanczos`, "-update", "1", lastFrame]);

const posters = [];
for (const width of POSTER_WIDTHS) {
  const name = width === WIDTH ? `hero-camion-poster-${VERSION}.webp` : `hero-camion-poster-${VERSION}-${width}.webp`;
  const out = path.join(IMG_DIR, name);
  const info = await sharp(lastFrame).resize({ width }).webp({ quality: POSTER_QUALITY }).toFile(out);
  posters.push({ name, info });
}
await rm(lastFrame, { force: true });

console.log("\nGenerado:");
for (const file of [webm, mp4]) {
  const { size } = await stat(file);
  const warn = size > MAX_BYTES ? "  <- pasa el objetivo de 4 MB" : "";
  console.log(`  assets/video/${path.basename(file)}  ${kb(size)}  ${durationOf(file).toFixed(2)} s${warn}`);
}
for (const { name, info } of posters) {
  console.log(`  assets/img/${name}  ${info.width}x${info.height}  ${kb(info.size)}`);
}
