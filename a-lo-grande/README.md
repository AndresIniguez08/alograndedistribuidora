# A lo grande · Sitio institucional

Sitio estático de una sola página para una distribuidora de huevos con base en Pigüé y clientes en Neuquén.
Objetivo: captar consultas con un formulario simple y aparecer en Google.

## Estructura

```
public/                  Todo lo que se publica
  index.html             Estructura y contenido
  css/styles.css         Estilos, con tokens de diseño en :root
  js/main.js             Comportamiento y configuración (SITE_CONFIG)
  assets/                Tipografías, imágenes e ícono
  robots.txt, sitemap.xml, _headers
functions/api/contact.js Función de Cloudflare Pages que envía el formulario por mail
docs/                    Guías de publicación y de mejora visual
CLAUDE.md                Reglas del proyecto para Claude Code
```

## Trabajar en local

```bash
npm install
cp .dev.vars.example .dev.vars   # completar con tus claves para probar el formulario
npm run dev                      # sitio y función en http://localhost:8788
```

Para ver solo el diseño alcanza con abrir `public/index.html` en el navegador o usar la extensión Live Server de VS Code.
El formulario no envía mails sin la función.

## Cambiar datos de contacto

En `public/js/main.js`, bloque `SITE_CONFIG`: teléfono, WhatsApp, Instagram y horario.
Lo que quede vacío no se muestra en el sitio.

## Reemplazar las ilustraciones por fotos

- Productos: en `public/index.html`, cambiar el `src` de cada `<img>` dentro de `.product__media` por la foto real (relación 16:10) y actualizar el `alt`.
- Portada: en `public/css/styles.css`, token `--hero-image`: `url(../assets/img/hero.jpg)`.
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
