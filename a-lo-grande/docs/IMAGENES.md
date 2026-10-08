# Fotos del sitio

## Flujo

1. Las fotos originales (sin optimizar) van en `images-src/`, en la raíz del proyecto. Esa carpeta no se sube a git (`.gitignore`).
2. `npm run images` corre `scripts/optimize-images.mjs`, que lee `images-src/` y genera los WebP finales en `public/assets/img/`.
3. Esos WebP sí se suben a git: son los que usa `index.html`.

## Qué genera el script

- Nombres normalizados: minúsculas, sin tildes ni espacios (`huevos blanco.jpg` → `huevos-blanco-*.webp`).
- Tres anchos por foto — **800, 1200 y 1600px** — salvo que el archivo se llame `hero`, que usa **1280, 1920 y 2560px**.
- No recorta: solo `.rotate()` (respeta la orientación EXIF del celular) y `resize({ width, withoutEnlargement: true })`, conservando la proporción real de cada foto. No agranda fotos más chicas que el ancho pedido.
- Calidad WebP 78.
- Imprime por consola, para cada tamaño generado, el ancho y alto reales — y para el original, si es horizontal, vertical o cuadrada. Usá esos números como `width`/`height` del `<img>` en `index.html`.
- Si `images-src/` no existe o está vacía, el script avisa y termina sin error (no rompe `npm install` ni CI).

## Agregar una foto nueva

1. Copiarla a `images-src/` con un nombre descriptivo en minúsculas (ej. `huevos-volumen.jpg`).
2. Correr `npm run images` y anotar el ancho/alto que imprime para cada tamaño.
3. Usar el resultado (`assets/img/<nombre>-800.webp`, `-1200.webp`, `-1600.webp`) en el `srcset` del `<img>` en `index.html`, con esos `width`/`height`.

## Encuadre en CSS

Como el script no recorta, cada foto conserva su proporción real (horizontal, vertical o cuadrada), y el encuadre dentro de su marco se resuelve en `styles.css` con modificadores BEM en `.product__media`:

- `.product__media--top` / `.product__media--bottom` / `.product__media--low`: anclan el recorte (`object-position`) arriba, abajo, o un poco más abajo que arriba — para fotos verticales que no entran enteras en el marco 16:10.
- `.product__media--white`: en vez de recortar, muestra la foto completa (`object-fit: contain`) con fondo blanco a juego, para fotos ya fotografiadas sobre fondo blanco.
- `.product__media--portrait`: cambia el marco a un recuadro vertical (`aspect-ratio: 4 / 5`, ancho acotado, centrado) en vez de forzar 16:10, para fotos muy verticales.

Sin modificador, el marco es 16:10 con `object-fit: cover` centrado — sirve para fotos horizontales o que encuadran bien centradas.

## Fotos para recetas (pendientes)

La sección "Recetas" usa por ahora un marco ilustrado (`assets/img/receta-placeholder.svg`, mismo estilo que las ilustraciones de productos) en las 6 tarjetas y en el modal. Cuando haya fotos reales, uno por receta, con relación 4:5 (vertical) aproximada:

- `tortilla-papas.jpg`
- `huevos-rellenos.jpg`
- `panqueques.jpg`
- `budin-pan.jpg`
- `huevos-horno-verduras.jpg`
- `mayonesa-casera.jpg`

Mismo flujo que el resto: copiar a `images-src/`, `npm run images`, y reemplazar el `src`/`srcset` de la tarjeta y del `<template>` correspondiente en `index.html` (ver `README.md`, "Agregar una receta nueva"). El marco de la tarjeta y del modal ya usan `--recipe-media-ratio: 4 / 5`, así que una foto cercana a esa proporción no necesita modificador adicional.
