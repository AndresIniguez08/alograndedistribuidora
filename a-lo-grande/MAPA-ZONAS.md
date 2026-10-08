# Mapa de zonas de reparto

El mapa de la sección "Zonas de reparto" se arma con dos capas:
- **La geografía** es una imagen liviana (`public/assets/img/mapa-zonas.svg`, unos 20 KB) con las provincias y las rutas desde la base.
- **Los puntos y sus nombres** son HTML encima de la imagen. Así usan las tipografías del sitio, se pueden leer con lector de pantalla y editar sin tocar la imagen.

No usa Google Maps ni librerías externas: no hay claves, no hay costos y no se envían datos de los visitantes a terceros.

## Zonas actuales
Pigüé (base), Neuquén, Cipolletti y Mercedes (provincia de Buenos Aires).
Neuquén y Cipolletti están a unos 6 km, así que en el mapa se ven casi juntas. Es lo esperable a esta escala.

## Agregar o mover una zona
1. Editar `POINTS` en `scripts/generar-mapa.py` (latitud, longitud). Si la zona nueva queda fuera del recorte,
   ajustar también `LON_MIN`, `LON_MAX` y `LAT_CENTER`.
2. Correr el script (necesita Python 3 y `pip install shapely`):
   ```bash
   python scripts/generar-mapa.py
   ```
   La primera vez descarga datos de Natural Earth (dominio público, unos 45 MB) a `.cache/`, que no se sube a Git.
3. El script regenera el SVG e imprime las líneas de CSS con la posición de cada punto. Pegarlas en `public/css/styles.css`.
4. En `public/index.html`, agregar un `<li class="coverage-map__point coverage-map__point--nombre">` con su `<span class="coverage-map__label">`.
   Si el nombre queda cortado contra el borde derecho, sumar `coverage-map__point--left` para que la etiqueta se ubique a la izquierda del punto.
5. Actualizar la lista de etiquetas (`.chip`) y revisar 390 px y 1440 px.

## Código

HTML (reemplaza el `<figure class="coverage-map">` anterior en `index.html`):

```html
<figure class="coverage-map">
          <img class="coverage-map__base" src="assets/img/mapa-zonas.svg" width="1600" height="1000" loading="lazy" decoding="async" alt="">
          <ul class="coverage-map__points" aria-label="Zonas de reparto en el mapa">
            <li class="coverage-map__point coverage-map__point--base coverage-map__point--pigue">
              <span class="coverage-map__label">Pigüé<small>Nuestra base</small></span>
            </li>
            <li class="coverage-map__point coverage-map__point--neuquen coverage-map__point--left">
              <span class="coverage-map__label">Neuquén<small>Zona principal</small></span>
            </li>
            <li class="coverage-map__point coverage-map__point--cipolletti">
              <span class="coverage-map__label">Cipolletti</span>
            </li>
            <li class="coverage-map__point coverage-map__point--mercedes coverage-map__point--left">
              <span class="coverage-map__label">Mercedes</span>
            </li>
          </ul>
        </figure>
```

Etiquetas de zonas (junto al mapa):

```html
<ul class="chips">
            <li class="chip">Pigüé y zona</li>
            <li class="chip">Neuquén y Cipolletti</li>
            <li class="chip">Mercedes</li>
            <li class="chip">Otras localidades</li>
          </ul>
```

CSS (en `styles.css`, reemplaza todas las reglas `.coverage-map*` anteriores):

```css
/* Mapa: la geografía es una imagen (assets/img/mapa-zonas.svg) y los puntos son HTML encima.
   Para agregar una zona: un <li> nuevo en el HTML y su posición en % acá abajo.
   Las posiciones salen de la misma proyección del SVG (ver docs/MAPA-ZONAS.md). */
.coverage-map {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-slate);
}
.coverage-map__base { width: 100%; height: 100%; }
.coverage-map__points { position: absolute; inset: 0; }
.coverage-map__point { position: absolute; top: var(--y); left: var(--x); }

.coverage-map__point--pigue { --x: 64.96%; --y: 55.8%; }
.coverage-map__point--neuquen { --x: 24.58%; --y: 75.43%; }
.coverage-map__point--cipolletti { --x: 25.07%; --y: 75.17%; }
.coverage-map__point--mercedes { --x: 86.21%; --y: 14.03%; }

.coverage-map__point::before,
.coverage-map__point::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.coverage-map__point::before { width: 11px; height: 11px; background: var(--color-map-dot); box-shadow: 0 0 0 2px var(--color-slate); }
.coverage-map__point::after { z-index: -1; width: 30px; height: 30px; background: var(--color-map-dot); opacity: 0.2; }
.coverage-map__point--base::before { width: 15px; height: 15px; background: var(--color-amber); }
.coverage-map__point--base::after { width: 44px; height: 44px; background: var(--color-amber); opacity: 0.22; }

.coverage-map__label {
  position: absolute;
  top: 0;
  left: 16px;
  transform: translateY(-50%);
  color: var(--color-white);
  font: 600 var(--text-map-label) / 1.2 var(--font-head);
  white-space: nowrap;
  text-shadow: 0 1px 8px rgb(0 0 0 / 0.65);
}
.coverage-map__label small {
  display: block;
  font: 400 0.78em / 1.3 var(--font-body);
  opacity: 0.78;
}
.coverage-map__point--base .coverage-map__label { left: 22px; }
.coverage-map__point--left .coverage-map__label { right: 16px; left: auto; text-align: right; }
```

Tokens nuevos en `:root`:

```css
--color-map-dot: #7c93ff;
--text-map-label: clamp(0.8rem, 0.6rem + 0.7vw, 1.2rem);
```

Y dentro de `@media (max-width: 560px)`:

```css
.coverage-map__point:not(.coverage-map__point--base) .coverage-map__label small { display: none; }
```
