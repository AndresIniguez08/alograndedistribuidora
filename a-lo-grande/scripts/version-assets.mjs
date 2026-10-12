// Agrega un hash del contenido a las URLs de styles.css y main.js en index.html (?v=<hash>).
// Uso: npm run assets:version (también corre antes de npm run deploy).
// Por qué: el HTML se revalida en cada visita, pero el CSS y el JS pueden quedar horas en la
// caché del navegador. Si el HTML nuevo convive con un CSS viejo, el sitio se rompe (pasó con
// el logo en octubre de 2026). Con el hash en la URL, cada cambio pide un archivo nuevo.
// Ver docs/PUBLICACION.md, "Caché y nombres con hash".

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const INDEX = path.join(PUBLIC_DIR, "index.html");

// Archivo -> patrón de su referencia en index.html (con o sin ?v= anterior)
const ASSETS = [
  { file: "css/styles.css", pattern: /(href=")css\/styles\.css(?:\?v=[0-9a-f]+)?(")/ },
  { file: "js/main.js", pattern: /(src=")js\/main\.js(?:\?v=[0-9a-f]+)?(")/ },
];

const hashOf = async (file) =>
  createHash("sha256")
    .update(await readFile(path.join(PUBLIC_DIR, file)))
    .digest("hex")
    .slice(0, 8);

let html = await readFile(INDEX, "utf8");
for (const { file, pattern } of ASSETS) {
  if (!pattern.test(html)) {
    console.error(`No encontré la referencia a ${file} en index.html`);
    process.exit(1);
  }
  const hash = await hashOf(file);
  html = html.replace(pattern, `$1${file}?v=${hash}$2`);
  console.log(`${file}?v=${hash}`);
}
await writeFile(INDEX, html);
