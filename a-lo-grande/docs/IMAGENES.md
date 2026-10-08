# Fotos del sitio

## Flujo

1. Las fotos originales (sin optimizar) van en `images-src/`, en la raíz del proyecto. Esa carpeta no se sube a git (`.gitignore`).
2. `npm run images` corre `scripts/optimize-images.mjs`, que lee `images-src/` y genera los WebP finales en `public/assets/img/`.
3. Esos WebP sí se suben a git: son los que usa `index.html`.

## Qué genera el script

- Nombres normalizados: minúsculas, sin tildes ni espacios (`huevos blanco.jpg` → `huevos-blanco-*.webp`).
- Tres anchos por foto — **800, 1200 y 1600px**, recorte 16:10 — salvo que el archivo se llame `hero`, que usa **1280, 1920 y 2560px** en 16:9.
- Recorte con `fit: cover` y `position: attention` (sharp detecta la zona de interés de la imagen).
- Respeta la orientación EXIF del celular (`.rotate()`).
- Calidad WebP 78.
- No agranda fotos más chicas que el ancho pedido: si el original mide menos, avisa por consola y omite ese tamaño.
- Si `images-src/` no existe o está vacía, el script avisa y termina sin error (no rompe `npm install` ni CI).

## Agregar una foto nueva

1. Copiarla a `images-src/` con un nombre descriptivo en minúsculas (ej. `huevos-volumen.jpg`).
2. Correr `npm run images`.
3. Usar el resultado (`assets/img/<nombre>-800.webp`, `-1200.webp`, `-1600.webp`) en el `srcset` del `<img>` en `index.html`.

## Encuadre en CSS

El recorte automático de `sharp` no siempre alcanza (por ejemplo, una foto vertical en un contenedor 16:10, o una foto sobre fondo blanco que no debe recortarse). Para esos casos, `.product__media` tiene modificadores BEM en `styles.css`:

- `.product__media--top` / `.product__media--bottom`: ancla el recorte arriba o abajo (`object-position`, vía los tokens `--image-position-top` / `--image-position-bottom`).
- `.product__media--contain`: en vez de recortar, muestra la foto completa (`object-fit: contain`) con fondo blanco a juego, para fotos ya fotografiadas sobre fondo blanco.
