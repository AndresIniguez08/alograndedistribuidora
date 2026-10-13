// Genera los videos de fondo (portada y contacto) y sus pósters a partir de los originales en images-src/.
// Uso: npm run video -- <nombre>      (nombres: ver VIDEOS abajo; sin nombre, lista los disponibles)
// Necesita ffmpeg: usa el de ffmpeg-static (devDependency) o, si no está, el del sistema (PATH).
//
// Los nombres llevan versión (-v1): /assets/* se sirve con caché largo, así que si un video cambia hay que
// subir su `version` y actualizar las referencias en index.html, nunca pisar el archivo (ver docs/IMAGENES.md).

import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const VIDEOS = {
  // Portada: 3 s, sin recorte. Se repite en loop.
  portada: {
    source: /^camion con logo\.[a-z0-9]+$/i,
    base: "hero-camion",
    version: "v1",
    width: 1280,
    fps: 30,
    crfMp4: 27,
    crfWebm: 36,
    posterWidths: [1280, 800], // el original tiene 1280 px: no se agranda
    posterQuality: 80,
  },
  // Contacto: una mano acomoda huevos en el maple. Se corta a los 10 s (cuatro huevos, sin mano)
  // y se reproduce una vez, quedando en ese último fotograma.
  contacto: {
    source: /^huevos en maple\.[a-z0-9]+$/i,
    base: "contacto-huevos",
    version: "v1",
    width: 1280,
    fps: 25,
    crfMp4: 29,
    crfWebm: 37,
    trimEnd: 10,
    posterWidths: [1600, 800],
    posterQuality: 80,
  },
};
const MAX_BYTES = 3 * 1024 * 1024; // objetivo; Cloudflare Pages no acepta archivos de más de 25 MiB

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
  const result = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
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

async function build(name, cfg) {
  const sourceFile = (await readdir(SRC_DIR)).find((file) => cfg.source.test(file));
  if (!sourceFile) {
    console.error(`No encontré el original de "${name}" en ${SRC_DIR}`);
    process.exit(1);
  }
  const source = path.join(SRC_DIR, sourceFile);
  const sourceDuration = durationOf(source);
  const end = Math.min(cfg.trimEnd ?? sourceDuration, sourceDuration);
  const trim = cfg.trimEnd ? ["-t", String(end)] : [];
  await mkdir(VIDEO_DIR, { recursive: true });

  const base = `${cfg.base}-${cfg.version}`;
  const filters = `scale=${cfg.width}:-2:flags=lanczos,fps=${cfg.fps}`;
  const mp4 = path.join(VIDEO_DIR, `${base}.mp4`);
  const webm = path.join(VIDEO_DIR, `${base}.webm`);

  console.log(`\n[${name}] ${sourceFile} (${sourceDuration.toFixed(2)} s)` +
    (cfg.trimEnd ? `, recorte 0 a ${end.toFixed(2)} s` : ", sin recorte"));

  // H.264 para Safari y navegadores sin VP9
  run(["-i", source, ...trim, "-an", "-vf", filters, "-c:v", "libx264", "-preset", "slow",
    "-crf", String(cfg.crfMp4), "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  // VP9 (más liviano; se ofrece primero). Calidad constante: -b:v 0 con -crf.
  run(["-i", source, ...trim, "-an", "-vf", filters, "-c:v", "libvpx-vp9", "-b:v", "0",
    "-crf", String(cfg.crfWebm), "-pix_fmt", "yuv420p", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", webm]);

  // Póster: último fotograma del tramo usado (el video termina o se corta ahí, así no hay salto)
  const lastFrame = path.join(os.tmpdir(), `${base}-ultimo.png`);
  run(["-ss", String(Math.max(0, end - 1 / cfg.fps)), "-i", source, "-frames:v", "1", "-update", "1", lastFrame]);
  const posters = [];
  for (const [index, width] of cfg.posterWidths.entries()) {
    const file = index === 0 ? `${cfg.base}-poster-${cfg.version}.webp` : `${cfg.base}-poster-${cfg.version}-${width}.webp`;
    const info = await sharp(lastFrame).resize({ width, withoutEnlargement: true })
      .webp({ quality: cfg.posterQuality }).toFile(path.join(IMG_DIR, file));
    posters.push({ file, info });
  }
  await rm(lastFrame, { force: true });

  console.log("Generado:");
  for (const file of [webm, mp4]) {
    const { size } = await stat(file);
    const warn = size > MAX_BYTES ? "  <- pasa el objetivo de 3 MB" : "";
    console.log(`  assets/video/${path.basename(file)}  ${kb(size)}  ${durationOf(file).toFixed(2)} s${warn}`);
  }
  for (const { file, info } of posters) {
    console.log(`  assets/img/${file}  ${info.width}x${info.height}  ${kb(info.size)}`);
  }
}

const wanted = process.argv.slice(2);
if (wanted.length === 0) {
  console.log(`Uso: npm run video -- <nombre>\nDisponibles: ${Object.keys(VIDEOS).join(", ")}`);
  process.exit(0);
}
for (const name of wanted) {
  if (!VIDEOS[name]) {
    console.error(`No existe "${name}". Disponibles: ${Object.keys(VIDEOS).join(", ")}`);
    process.exit(1);
  }
  await build(name, VIDEOS[name]);
}
