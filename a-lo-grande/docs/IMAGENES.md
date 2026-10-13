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

## Videos de fondo (portada y contacto)

Las dos secciones usan el mismo componente: `bg-video` en el CSS (póster, video, overlay) más el botón `video-toggle`,
y `initBackgroundVideo` en `main.js`. Debajo del video siempre hay un póster con el **último fotograma**: es lo que se ve
antes de que arranque el video (que entra con un fundido) y lo único que se ve si el video no se carga.

| Sección | Video | Final | Carga |
| --- | --- | --- | --- |
| Portada | Camión (3 s), a la velocidad de `data-playback-rate` | En loop (`data-bg-video-loop`) | Al abrir la página |
| Contacto | Una mano acomoda huevos en el maple (recortado a 10 s) | Una vez; queda en el último fotograma (cuatro huevos) | Recién cuando la sección está a 300 px de la pantalla (`data-bg-video-lazy="300px"`); el póster, con `loading="lazy"` |

El video de contacto no va en loop porque su primer fotograma (una mano, un huevo) y el último (cuatro huevos, sin mano) son
muy distintos: en loop se verían "desaparecer" los huevos de golpe.

Como los dos son movimiento automático de más de 5 s, cada sección tiene un botón de pausa (abajo a la derecha,
`data-bg-video-toggle`, con `aria-pressed`) que solo aparece mientras el video corre. Si la persona lo pausa, no se reanuda
solo al volver a la pestaña. En contacto, cuando el video termina, el botón se oculta.

Cuándo se carga un video: nunca con `prefers-reduced-motion`, con ahorro de datos o con conexión 2g; en pantallas de hasta
700 px, solo con 4g (si el navegador no informa la conexión, se carga). En los demás casos queda solo el póster. Se pausa
con la pestaña oculta o la sección fuera de pantalla.

| Archivo | Qué es | Peso |
| --- | --- | --- |
| `assets/video/hero-camion-v1.webm` | VP9, 1280 px, 30 fps, CRF 36, sin audio (se ofrece primero) | 215 KB |
| `assets/video/hero-camion-v1.mp4` | H.264, 1280 px, 30 fps, CRF 27, preset slow, yuv420p, `+faststart`, sin audio | 250 KB |
| `assets/img/hero-camion-poster-v1.webp` | Último fotograma, 1280 × 720 (el original no tiene más), calidad 80 | 39 KB |
| `assets/img/hero-camion-poster-v1-800.webp` | Ídem 800 × 450, para pantallas de hasta 700 px | 23 KB |
| `assets/video/contacto-huevos-v1.webm` | VP9, 1280 px, 25 fps, CRF 37, sin audio, 0 a 10 s | 519 KB |
| `assets/video/contacto-huevos-v1.mp4` | H.264, 1280 px, 25 fps, CRF 29, preset slow, yuv420p, `+faststart`, sin audio, 0 a 10 s | 599 KB |
| `assets/img/contacto-huevos-poster-v1.webp` | Último fotograma del tramo (10 s), 1600 × 900, calidad 80 | 92 KB |
| `assets/img/contacto-huevos-poster-v1-800.webp` | Ídem 800 × 450, para pantallas de hasta 700 px | 31 KB |

Los originales (`images-src/camion con logo.mp4` y `images-src/huevos en maple.mp4`, 1920 × 1080, 12,7 s) no se suben a git.

**Regenerar** (necesita ffmpeg: viene con la devDependency `ffmpeg-static`, o el del sistema si está en el PATH):

```bash
npm run video -- portada
npm run video -- contacto
```

`scripts/build-video.mjs` tiene la configuración de cada video (original, ancho, fps, CRF, recorte y tamaños del póster) en
`VIDEOS`, y corre lo equivalente a (ejemplo de contacto):

```bash
ffmpeg -i "huevos en maple.mp4" -t 10 -an -vf "scale=1280:-2:flags=lanczos,fps=25" -c:v libx264 -preset slow -crf 29 -pix_fmt yuv420p -movflags +faststart contacto-huevos-v1.mp4
ffmpeg -i "huevos en maple.mp4" -t 10 -an -vf "scale=1280:-2:flags=lanczos,fps=25" -c:v libvpx-vp9 -b:v 0 -crf 37 -pix_fmt yuv420p -row-mt 1 -deadline good -cpu-used 2 contacto-huevos-v1.webm
ffmpeg -ss 9.96 -i "huevos en maple.mp4" -frames:v 1 ultimo.png   # póster: último fotograma del tramo
```

y pasa ese fotograma a WebP con sharp. Imprime el peso y la duración de cada archivo.
Objetivo: menos de 3 MB por video; Cloudflare Pages no acepta archivos de más de 25 MiB.

**Si un video cambia, subí su versión** (`version: "v2"` en `VIDEOS`) y actualizá las rutas en `index.html`
(`data-src-webm`, `data-src-mp4` y el `srcset` del póster). No pises los archivos `-v1`: el póster `.webp` se sirve como
`immutable` por un año y el resto de `/assets/*` con una hora de caché. Borrá los `-v1` cuando ya nada los use.
Por eso el script exige el nombre del video: así no se regenera por accidente uno que no cambió.

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
