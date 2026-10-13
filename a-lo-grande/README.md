# A lo grande Mayorista · Sitio institucional

Sitio estático de una sola página para A lo grande Mayorista, distribuidora de huevos con sede principal en Pigüé,
depósito en Neuquén y punto de carga en Mercedes.
Objetivo: captar consultas con un formulario simple y aparecer en Google.

## Estructura

```
public/                  Todo lo que se publica
  index.html             Estructura y contenido
  css/styles.css         Estilos, con tokens de diseño en :root
  js/main.js             Comportamiento y configuración (SITE_CONFIG)
  assets/fonts/          Tipografías autoalojadas
  assets/img/            Fotos (WebP con hash, generadas por npm run images), póster de la portada y mapa de zonas
  assets/video/          Videos de fondo de portada y contacto (npm run video -- <nombre>, nombre con versión)
  assets/img/logo/       Logo y mascota (copiados del kit de marca, no pasan por el script)
  assets/img/icons/      Íconos 192 y 512 para site.webmanifest
  favicon.ico, favicon-*.png, apple-touch-icon-180.png, site.webmanifest
  robots.txt, sitemap.xml, _headers
functions/api/contact.js Función de Cloudflare Pages que envía el formulario por mail
docs/                    Guías de publicación, mejora visual, imágenes y mapa de zonas
scripts/                 Optimización de imágenes y generador del mapa de zonas
CLAUDE.md                Reglas del proyecto para Claude Code
```

## Trabajar en local

```bash
npm install
cp .dev.vars.example .dev.vars   # completar con tus claves para probar el formulario
npm run dev                      # sitio y función en http://localhost:8788
npm run assets:version           # después de tocar styles.css o main.js (ver docs/PUBLICACION.md)
```

Para ver solo el diseño alcanza con abrir `public/index.html` en el navegador o usar la extensión Live Server de VS Code.
El formulario no envía mails sin la función.

## Cambiar datos de contacto

En `public/js/main.js`, bloque `SITE_CONFIG`: teléfono, WhatsApp, Instagram y horario.
Lo que quede vacío no se muestra en el sitio.

## Reemplazar las ilustraciones por fotos

- Productos: en `public/index.html`, cambiar el `src` de cada `<img>` dentro de `.product__media` por la foto real (relación 16:10) y actualizar el `alt`.
- Portada y contacto: videos de fondo con su póster. Ver `docs/IMAGENES.md`, "Videos de fondo" (`npm run video -- <nombre>`).
- Recetas: ver `docs/IMAGENES.md`, sección "Fotos para recetas".

## Agregar una receta nueva

En `public/index.html`, dentro de `<section id="recetas">`:

1. Copiar un `<li class="carousel__item">` entero (con su `<button class="recipe-card" data-recipe-open="ID">`) y pegarlo al final de la lista `.carousel__track`. Cambiar el `ID`, la foto (`src`/`srcset`/`width`/`height`), el `alt`, el título y el tiempo/porciones.
   El modal no tiene foto propia: toma automáticamente la de la tarjeta, así que alcanza con poner la foto acá.
2. Copiar el `<template id="receta-ID">` de esa misma receta y pegarlo al final de la sección, antes de `</section>`. Cambiar el `id` del `<template>` (y el de su `<h3 id="receta-ID-titulo">`) para que coincida con el `ID` nuevo del paso 1, y completar título, tiempo/porciones, ingredientes y preparación.
3. Si la receta usa huevo crudo o tiene algún otro punto de seguridad alimentaria, sumar un `<p class="recipe-modal__tip">` al final del `<template>` (ver el de "Mayonesa casera").
4. Para la foto real, seguir `docs/IMAGENES.md`.

## Publicar

Ver `docs/PUBLICACION.md`.

## Convenciones

Resumidas en `CLAUDE.md`. Lo esencial: sin frameworks ni dependencias en el front, tokens para todo valor visual,
nombres BEM (`bloque__elemento--modificador`) y ganchos de JavaScript por atributos `data-*`.
