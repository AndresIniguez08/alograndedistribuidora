# Fotos del sitio

## Flujo

1. Las fotos originales (sin optimizar) van en `images-src/`, en la raíz del proyecto. Esa carpeta no se sube a git (`.gitignore`).
2. `npm run images` corre `scripts/optimize-images.mjs`, que lee `images-src/` y genera los WebP finales en `public/assets/img/`.
3. Esos WebP sí se suben a git: son los que usa `index.html`.

## Logo, íconos e imagen para compartir

Son archivos **finales** del kit de marca (`images-src/a-lo-grande-logos/`, con su `LEEME.txt`): ya vienen optimizados y con
transparencia. **No se pasan por `npm run images`**: el script los recomprimiría y les cambiaría el nombre. (Hoy el script
solo lee `.jpg`/`.png` sueltos en la raíz de `images-src/` y no entra en subcarpetas, así que el kit queda afuera; no mover
archivos del kit a la raíz de `images-src/`.) Se copian tal cual, con el mismo nombre:

| Archivo | Dónde se usa |
| --- | --- |
| `assets/img/logo/logo-horizontal-400.webp` / `-800.webp` | Encabezado (fondo claro, texto negro). 64 px de alto en escritorio, 52 px en móvil. |
| `assets/img/logo/logo-horizontal-texto-blanco-400.webp` / `-800.webp` | Pie (fondo navy, texto blanco). 48 px de alto, con `loading="lazy"`. |
| `assets/img/logo/logo-horizontal.png` | Datos estructurados (`logo` del JSON-LD). La versión de texto blanco en PNG queda de reserva. |
| `assets/img/logo/mascota-huevo.png` / `-400.webp` | Copiada, todavía sin usar. |
| `/favicon.ico`, `/favicon-16.png`, `/favicon-32.png`, `/favicon-48.png`, `/apple-touch-icon-180.png` | Raíz de `public/`: pestaña del navegador e ícono en iPhone. |
| `assets/img/icons/icon-192.png` / `icon-512.png` | `site.webmanifest` (íconos en Android). |
| `assets/img/og-image-1200x630.png` | `og:image` y `twitter:image` (vista previa al compartir el link). |

El `<img>` del logo lleva `width="891" height="483"` (la proporción real del archivo) para que el navegador reserve el lugar
antes de cargarlo; el alto en pantalla sale de los tokens `--logo-height` y `--logo-height-footer`.

**Si el logo cambia, subí la versión del nombre** (`logo-horizontal-v2-400.webp`, `og-image-1200x630-v2.png`, etc.) y
actualizá las referencias, en lugar de pisar el archivo. Los `.webp` de `/assets/img/` se sirven como `immutable` por un año
y el resto de `/assets/*` con una hora de caché: con el mismo nombre, quien ya visitó el sitio seguiría viendo el logo viejo.

## Qué genera el script

- Nombres normalizados: minúsculas, sin tildes ni espacios (`huevos blanco.jpg` → `huevos-blanco-*.webp`).
- Hash del contenido en el nombre: `huevos-blanco-800.1a2b3c4d.webp`. Los `.webp` se sirven como `immutable` por un año,
  así que una foto nueva tiene que tener otra URL. El script borra la versión anterior de cada tamaño y actualiza las
  referencias que ya existan en `index.html` y `styles.css`. No editar ni reemplazar un `.webp` a mano conservando el nombre
  (ver `docs/PUBLICACION.md`, "Caché y nombres con hash").
- Tres anchos por foto — **800, 1200 y 1600px** — salvo que el archivo se llame `hero`, que usa **1280, 1920 y 2560px**.
- No recorta: solo `.rotate()` (respeta la orientación EXIF del celular) y `resize({ width, withoutEnlargement: true })`, conservando la proporción real de cada foto. No agranda fotos más chicas que el ancho pedido.
- Calidad WebP 78.
- Imprime por consola, para cada tamaño generado, el ancho y alto reales — y para el original, si es horizontal, vertical o cuadrada. Usá esos números como `width`/`height` del `<img>` en `index.html`.
- Si `images-src/` no existe o está vacía, el script avisa y termina sin error (no rompe `npm install` ni CI).

## Agregar una foto nueva

1. Copiarla a `images-src/` con un nombre descriptivo en minúsculas (ej. `huevos-volumen.jpg`).
2. Correr `npm run images` y anotar el ancho/alto que imprime para cada tamaño.
3. Usar el resultado (`assets/img/<nombre>-800.<hash>.webp`, `-1200.<hash>.webp`, `-1600.<hash>.webp`, tal como los imprime) en el `srcset` del `<img>` en `index.html`, con esos `width`/`height`.

## Encuadre en CSS

Como el script no recorta, cada foto conserva su proporción real (horizontal, vertical o cuadrada), y el encuadre dentro de su marco se resuelve en `styles.css` con modificadores BEM en `.product__media`:

- `.product__media--top` / `.product__media--bottom` / `.product__media--low`: anclan el recorte (`object-position`) arriba, abajo, o un poco más abajo que arriba — para fotos verticales que no entran enteras en el marco 16:10.
- `.product__media--white`: en vez de recortar, muestra la foto completa (`object-fit: contain`) con fondo blanco a juego, para fotos ya fotografiadas sobre fondo blanco.
- `.product__media--portrait`: cambia el marco a un recuadro vertical (`aspect-ratio: 4 / 5`, ancho acotado, centrado) en vez de forzar 16:10, para fotos muy verticales.

Sin modificador, el marco es 16:10 con `object-fit: cover` centrado — sirve para fotos horizontales o que encuadran bien centradas.

## Fotos de recetas

Cada receta tiene su foto en la tarjeta (`.recipe-card__media img`, relación 4:5 aproximada) con nombre `<id>.jpg` en `images-src/`:

- `tortilla-papas.jpg`
- `huevos-rellenos.jpg`
- `panqueques.jpg`
- `budin-pan.jpg`
- `huevos-horno-verduras.jpg`
- `mayonesa-casera.jpg`

**El modal no tiene foto propia.** Al abrir una receta, el JS toma el `src`/`srcset`/`width`/`height`/`alt` del `<img>` de la tarjeta que se clickeó y los copia al único `<img data-recipe-media>` del `<dialog>` (ajustando `sizes` al ancho del modal). Por eso alcanza con actualizar la foto en la tarjeta — no hay que tocar nada en el `<template>` de esa receta.

Mismo flujo que el resto: copiar a `images-src/` con el nombre de arriba, `npm run images`, y usar el `srcset` generado (`assets/img/<id>-800.<hash>.webp`, `-1200.<hash>.webp`, `-1600.<hash>.webp`) en el `src`/`srcset` de la tarjeta en `index.html` (ver `README.md`, "Agregar una receta nueva"). Si el original es muy horizontal, revisar el recorte dentro del marco 4:5 y, si hace falta, agregar un modificador como los de `.product__media`.
